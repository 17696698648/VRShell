use crate::connect;
use crate::sessions::AppState;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::{
    fs::File,
    io::{Cursor, Read, Write},
    path::Path,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{Emitter, State};

const SFTP_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
pub(crate) const DEFAULT_SFTP_IDLE_TIMEOUT_SECS: u64 = 10 * 60;

/// Default buffer size for SFTP stream copies (64 KiB).
const SFTP_COPY_BUFFER_SIZE: usize = 64 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpError {
    code: String,
    message: String,
    recoverable: bool,
    #[serde(skip_serializing_if = "Map::is_empty")]
    details: Map<String, Value>,
}

type SftpResult<T> = Result<T, SftpError>;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpConnectionArgs {
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
    passphrase: Option<String>,
}

impl SftpConnectionArgs {
    fn session_key(&self) -> String {
        sftp_session_key(&self.host, self.port, &self.username)
    }
}

impl SftpError {
    fn new(
        code: impl Into<String>,
        message: impl Into<String>,
        path: Option<String>,
        recoverable: bool,
    ) -> Self {
        let mut details = Map::new();
        if let Some(path) = path {
            details.insert("path".to_string(), Value::String(path));
        }
        Self {
            code: code.into(),
            message: message.into(),
            recoverable,
            details,
        }
    }

    fn size_mismatch(path: &str, expected: u64, actual: u64) -> Self {
        Self::new(
            "size_mismatch",
            format!(
                "transfer size mismatch: expected {} bytes, got {} bytes",
                expected, actual
            ),
            Some(path.to_string()),
            true,
        )
    }
}

impl From<String> for SftpError {
    fn from(message: String) -> Self {
        let lower = message.to_lowercase();
        let code = if lower.contains("canceled") {
            "canceled"
        } else if lower.contains("auth") {
            "auth_failed"
        } else if lower.contains("timeout")
            || lower.contains("connect")
            || lower.contains("session")
            || lower.contains("handshake")
        {
            "connection"
        } else if lower.contains("not found") || lower.contains("no such") {
            "not_found"
        } else if lower.contains("permission") || lower.contains("denied") {
            "permission_denied"
        } else {
            "sftp_error"
        };
        let recoverable = matches!(
            code,
            "canceled" | "connection" | "sftp_error" | "size_mismatch"
        );
        Self::new(code, message, None, recoverable)
    }
}

impl From<&str> for SftpError {
    fn from(message: &str) -> Self {
        message.to_string().into()
    }
}

#[tauri::command]
pub async fn sftp_list(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    path: String,
) -> SftpResult<Vec<serde_json::Value>> {
    let remote_path = normalize_remote_path(&path);
    with_sftp(&state, &connection, |sftp| {
        let entries = sftp
            .readdir(Path::new(&remote_path))
            .map_err(|e| format!("readdir {} err: {}", remote_path, e))?;
        let mut out: Vec<serde_json::Value> = Vec::new();

        for (path, stat) in entries {
            let name = path
                .file_name()
                .and_then(|name| name.to_str().map(|value| value.to_string()))
                .unwrap_or_default();

            if name.is_empty() || name == "." || name == ".." {
                continue;
            }

            let size = stat.size.unwrap_or(0);
            let modified = stat.mtime.unwrap_or(0);
            let is_symlink = stat.perm.is_some_and(|p| (p & 0o170000) == 0o120000);
            let full_path = join_remote_path(&remote_path, &name);
            out.push(serde_json::json!({
                "name": name,
                "path": full_path,
                "size": format!("{} bytes", size),
                "sizeBytes": size,
                "modified": modified,
                "isDirectory": stat.is_dir(),
                "isSymlink": is_symlink
            }));
        }

        out.sort_by(|left, right| {
            let left_dir = left["isDirectory"].as_bool().unwrap_or(false);
            let right_dir = right["isDirectory"].as_bool().unwrap_or(false);
            right_dir
                .cmp(&left_dir)
                .then_with(|| left["name"].as_str().cmp(&right["name"].as_str()))
        });

        Ok(out)
    })
}

fn connect_sftp(
    connection: &SftpConnectionArgs,
    host_key_cache: Option<&crate::sessions::HostKeyCache>,
) -> Result<ssh2::Session, String> {
    connect::connect_ssh_session(connect::ConnectOptions {
        host: &connection.host,
        port: connection.port,
        auth: connect::AuthOptions {
            username: &connection.username,
            password: connection.password.as_deref(),
            private_key_path: connection.private_key_path.as_deref(),
            passphrase: connection.passphrase.as_deref(),
        },
        connect_timeout: Some(SFTP_CONNECT_TIMEOUT),
        verify_known_hosts: true,
        host_key_cache,
        interaction: connect::InteractionOptions::none(),
    })
    .map(|conn| conn.session)
    .map_err(|e| e.to_string())
}

pub(crate) fn sftp_session_key(host: &str, port: u16, username: &str) -> String {
    format!("{}@{}:{}", username, host, port)
}

fn register_sftp_task(
    state: &State<'_, AppState>,
    task_id: &str,
) -> Result<Arc<AtomicBool>, String> {
    let cancel_flag = Arc::new(AtomicBool::new(false));
    state
        .sftp_tasks
        .lock()
        .map_err(|e| format!("sftp task registry lock err: {}", e))?
        .insert(task_id.to_string(), cancel_flag.clone());
    Ok(cancel_flag)
}

fn finish_sftp_task(state: &State<'_, AppState>, task_id: &str) {
    if let Ok(mut tasks) = state.sftp_tasks.lock() {
        tasks.remove(task_id);
    }
}

fn check_sftp_task_cancelled(cancel_flag: &AtomicBool) -> Result<(), String> {
    if cancel_flag.load(Ordering::Relaxed) {
        Err("SFTP task canceled".into())
    } else {
        Ok(())
    }
}

fn get_sftp_task_queue(
    state: &State<'_, AppState>,
    session_key: &str,
) -> Result<Arc<Mutex<()>>, String> {
    let mut queues = state
        .sftp_task_queues
        .lock()
        .map_err(|e| format!("sftp task queue lock err: {}", e))?;
    Ok(queues
        .entry(session_key.to_string())
        .or_insert_with(|| Arc::new(Mutex::new(())))
        .clone())
}

fn is_sftp_session_healthy(session: &ssh2::Session) -> bool {
    // Lightweight check: no remote round鈥憈rip.
    // - A dead session will fail on the next real operation anyway.
    // - Avoid the stat("/") that would add a full SFTP RTT.
    session.sftp().is_ok()
}

#[tauri::command]
pub async fn set_sftp_idle_timeout(state: State<'_, AppState>, seconds: u64) -> SftpResult<()> {
    state
        .sftp_idle_timeout_secs
        .store(seconds.max(1), Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub async fn cancel_sftp_task(state: State<'_, AppState>, task_id: String) -> SftpResult<()> {
    if let Some(cancel_flag) = state
        .sftp_tasks
        .lock()
        .map_err(|e| format!("sftp task registry lock err: {}", e))?
        .get(&task_id)
    {
        cancel_flag.store(true, Ordering::Relaxed);
    }
    Ok(())
}

fn with_sftp<T>(
    state: &State<'_, AppState>,
    connection: &SftpConnectionArgs,
    operation: impl FnOnce(&ssh2::Sftp) -> SftpResult<T>,
) -> SftpResult<T> {
    let key = connection.session_key();
    let now = Instant::now();
    let idle_timeout =
        Duration::from_secs(state.sftp_idle_timeout_secs.load(Ordering::Relaxed).max(1));

    let handle = {
        let mut sessions = state
            .sftp_sessions
            .lock()
            .map_err(|e| format!("sftp session cache lock err: {}", e))?;
        sessions.retain(|_, handle| {
            handle
                .lock()
                .map(|handle| now.duration_since(handle.last_used) < idle_timeout)
                .unwrap_or(false)
        });

        if let Some(handle) = sessions.get(&key) {
            handle.clone()
        } else {
            let handle = Arc::new(Mutex::new(crate::sessions::SftpSessionHandle {
                session: connect_sftp(connection, Some(&state.pending_host_keys))?,
                last_used: now,
            }));
            sessions.insert(key.clone(), handle.clone());
            handle
        }
    };

    let mut handle = handle
        .lock()
        .map_err(|e| format!("sftp session lock err: {}", e))?;

    if !is_sftp_session_healthy(&handle.session) {
        drop(handle);
        if let Ok(mut sessions) = state.sftp_sessions.lock() {
            sessions.remove(&key);
        }
        return with_sftp(state, connection, operation);
    }

    handle.last_used = now;
    let sftp = handle.session.sftp().map_err(|e| {
        drop(handle);
        if let Ok(mut sessions) = state.sftp_sessions.lock() {
            sessions.remove(&key);
        }
        format!("sftp init err: {}", e)
    })?;

    match operation(&sftp) {
        Ok(value) => Ok(value),
        Err(error) => {
            if let Ok(mut sessions) = state.sftp_sessions.lock() {
                sessions.remove(&key);
            }
            Err(error)
        }
    }
}

#[tauri::command]
pub async fn disconnect_sftp_session(
    state: State<'_, AppState>,
    host: String,
    port: u16,
    username: String,
) -> SftpResult<()> {
    let key = sftp_session_key(&host, port, &username);
    let mut sessions = state
        .sftp_sessions
        .lock()
        .map_err(|e| format!("sftp session cache lock err: {}", e))?;
    sessions.remove(&key);
    Ok(())
}

fn ensure_sftp_directory(sftp: &ssh2::Sftp, remote_path: &str) -> SftpResult<()> {
    let remote_path = normalize_remote_path(remote_path);
    let mut current_path = String::new();

    for part in remote_path.split('/').filter(|part| !part.is_empty()) {
        current_path.push('/');
        current_path.push_str(part);
        let path = Path::new(&current_path);

        if sftp.stat(path).is_ok() {
            continue;
        }

        sftp.mkdir(path, 0o755)
            .map_err(|e| format!("mkdir {} err: {}", current_path, e))?;
    }

    Ok(())
}

fn normalize_remote_path(remote_path: &str) -> String {
    let normalized_input = remote_path.replace('\\', "/");
    let mut parts: Vec<&str> = Vec::new();

    for part in normalized_input.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            value => parts.push(value),
        }
    }

    if parts.is_empty() {
        "/".into()
    } else {
        format!("/{}", parts.join("/"))
    }
}

fn parent_remote_path(remote_path: &str) -> String {
    let normalized = normalize_remote_path(remote_path);
    let parts: Vec<&str> = normalized
        .split('/')
        .filter(|part| !part.is_empty())
        .collect();

    if parts.len() <= 1 {
        return "/".into();
    }

    format!("/{}", parts[..parts.len() - 1].join("/"))
}

fn join_remote_path(parent_path: &str, name: &str) -> String {
    let parent = normalize_remote_path(parent_path);
    let clean_name = name.trim_matches('/');

    if parent == "/" {
        normalize_remote_path(&format!("/{}", clean_name))
    } else {
        normalize_remote_path(&format!("{}/{}", parent, clean_name))
    }
}

fn remote_is_directory(sftp: &ssh2::Sftp, remote_path: &str) -> Result<bool, String> {
    let normalized = normalize_remote_path(remote_path);
    let stat = sftp
        .stat(Path::new(&normalized))
        .map_err(|e| format!("stat {} err: {}", normalized, e))?;
    Ok(stat.is_dir())
}

fn delete_recursive(
    sftp: &ssh2::Sftp,
    remote_path: &str,
    cancel_flag: &AtomicBool,
    deleted: &mut u64,
    on_progress: &mut impl FnMut(&str, u64),
) -> SftpResult<()> {
    check_sftp_task_cancelled(cancel_flag)?;
    let normalized = normalize_remote_path(remote_path);

    if normalized == "/" {
        return Err("refusing to delete remote root".into());
    }

    if remote_is_directory(sftp, &normalized)? {
        let entries = sftp
            .readdir(Path::new(&normalized))
            .map_err(|e| format!("readdir {} err: {}", normalized, e))?;

        for (entry_path, stat) in entries {
            let name = entry_path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default();

            if name.is_empty() || name == "." || name == ".." {
                continue;
            }

            let child_path = join_remote_path(&normalized, name);
            if stat.is_dir() {
                delete_recursive(sftp, &child_path, cancel_flag, deleted, on_progress)?;
            } else {
                check_sftp_task_cancelled(cancel_flag)?;
                sftp.unlink(Path::new(&child_path))
                    .map_err(|e| format!("unlink {} err: {}", child_path, e))?;
                *deleted += 1;
                on_progress(&child_path, *deleted);
            }
        }

        check_sftp_task_cancelled(cancel_flag)?;
        sftp.rmdir(Path::new(&normalized))
            .map_err(|e| format!("rmdir {} err: {}", normalized, e))?;
        *deleted += 1;
        on_progress(&normalized, *deleted);
    } else {
        check_sftp_task_cancelled(cancel_flag)?;
        sftp.unlink(Path::new(&normalized))
            .map_err(|e| format!("unlink {} err: {}", normalized, e))?;
        *deleted += 1;
        on_progress(&normalized, *deleted);
    }

    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpUploadItem {
    remote_path: String,
    data_base64: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpPathUploadItem {
    local_path: String,
    remote_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpUploadFailure {
    remote_path: String,
    error: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpUploadSummary {
    uploaded: usize,
    failed: Vec<SftpUploadFailure>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SftpProgressEvent {
    task_id: String,
    session_key: String,
    operation: String,
    file: String,
    transferred: u64,
    total: u64,
    deleted: u64,
}

#[allow(clippy::too_many_arguments)]
fn emit_sftp_progress(
    app: &tauri::AppHandle,
    task_id: &str,
    session_key: &str,
    operation: &str,
    file: &str,
    transferred: u64,
    total: u64,
    deleted: u64,
) {
    let _ = app.emit(
        "sftp-progress",
        SftpProgressEvent {
            task_id: task_id.into(),
            session_key: session_key.into(),
            operation: operation.into(),
            file: file.into(),
            transferred,
            total,
            deleted,
        },
    );
}

fn verify_transfer_size(path: &str, expected: u64, actual: u64) -> SftpResult<()> {
    if expected == 0 || expected == actual {
        Ok(())
    } else {
        Err(SftpError::size_mismatch(path, expected, actual))
    }
}

fn copy_with_progress<R: Read, W: Write>(
    mut reader: R,
    mut writer: W,
    total: u64,
    cancel_flag: &AtomicBool,
    mut on_progress: impl FnMut(u64),
    buffer_size: usize,
) -> Result<u64, String> {
    let mut buf = vec![0u8; buffer_size];
    let mut transferred = 0u64;

    loop {
        check_sftp_task_cancelled(cancel_flag)?;
        let read = reader
            .read(&mut buf)
            .map_err(|e| format!("read err: {}", e))?;
        if read == 0 {
            break;
        }

        writer
            .write_all(&buf[..read])
            .map_err(|e| format!("write err: {}", e))?;
        transferred += read as u64;
        on_progress(transferred);
    }

    Ok(transferred.max(total.min(transferred)))
}

#[tauri::command]
pub async fn sftp_upload(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    remote_path: String,
    data_base64: String,
    task_id: String,
) -> SftpResult<()> {
    let remote_path = normalize_remote_path(&remote_path);
    let session_key = connection.session_key();
    let cancel_flag = register_sftp_task(&state, &task_id)?;
    let queue = get_sftp_task_queue(&state, &session_key)?;
    let result = (|| -> SftpResult<()> {
        let _queue_guard = queue
            .lock()
            .map_err(|e| format!("sftp task queue lock err: {}", e))?;
        check_sftp_task_cancelled(&cancel_flag)?;
        with_sftp(&state, &connection, |sftp| {
            ensure_sftp_directory(sftp, &parent_remote_path(&remote_path))?;
            let bytes = STANDARD
                .decode(&data_base64)
                .map_err(|e| format!("base64 decode err: {}", e))?;
            let total = bytes.len() as u64;
            let mut reader = Cursor::new(bytes);
            let mut remote_file = sftp
                .create(Path::new(&remote_path))
                .map_err(|e| format!("create remote file err: {}", e))?;
            emit_sftp_progress(
                &app,
                &task_id,
                &session_key,
                "upload",
                &remote_path,
                0,
                total,
                0,
            );
            let transferred = copy_with_progress(
                &mut reader,
                &mut remote_file,
                total,
                &cancel_flag,
                |transferred| {
                    emit_sftp_progress(
                        &app,
                        &task_id,
                        &session_key,
                        "upload",
                        &remote_path,
                        transferred,
                        total,
                        0,
                    );
                },
                SFTP_COPY_BUFFER_SIZE,
            )
            .map_err(|e| format!("stream upload {} err: {}", remote_path, e))?;
            verify_transfer_size(&remote_path, total, transferred)?;
            drop(remote_file);
            if let Some(remote_size) = sftp
                .stat(Path::new(&remote_path))
                .ok()
                .and_then(|stat| stat.size)
            {
                verify_transfer_size(&remote_path, total, remote_size)?;
            }
            Ok(())
        })
    })();
    finish_sftp_task(&state, &task_id);
    result
}

#[tauri::command]
pub async fn sftp_upload_many(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    files: Vec<SftpUploadItem>,
    task_id: String,
) -> SftpResult<SftpUploadSummary> {
    let session_key = connection.session_key();
    let cancel_flag = register_sftp_task(&state, &task_id)?;
    let queue = get_sftp_task_queue(&state, &session_key)?;
    let result = (|| -> SftpResult<SftpUploadSummary> {
        let _queue_guard = queue
            .lock()
            .map_err(|e| format!("sftp task queue lock err: {}", e))?;
        check_sftp_task_cancelled(&cancel_flag)?;
        with_sftp(&state, &connection, |sftp| {
            let mut uploaded = 0usize;
            let mut failed = Vec::new();

            for file in files {
                check_sftp_task_cancelled(&cancel_flag)?;
                let remote_path = normalize_remote_path(&file.remote_path);
                let result = (|| -> SftpResult<()> {
                    ensure_sftp_directory(sftp, &parent_remote_path(&remote_path))?;
                    let bytes = STANDARD
                        .decode(&file.data_base64)
                        .map_err(|e| format!("base64 decode err: {}", e))?;
                    let total = bytes.len() as u64;
                    let mut reader = Cursor::new(bytes);
                    let mut remote_file = sftp
                        .create(Path::new(&remote_path))
                        .map_err(|e| format!("create err: {}", e))?;
                    emit_sftp_progress(
                        &app,
                        &task_id,
                        &session_key,
                        "upload",
                        &remote_path,
                        0,
                        total,
                        0,
                    );
                    let transferred = copy_with_progress(
                        &mut reader,
                        &mut remote_file,
                        total,
                        &cancel_flag,
                        |transferred| {
                            emit_sftp_progress(
                                &app,
                                &task_id,
                                &session_key,
                                "upload",
                                &remote_path,
                                transferred,
                                total,
                                0,
                            );
                        },
                        SFTP_COPY_BUFFER_SIZE,
                    )
                    .map_err(|e| format!("stream upload {} err: {}", remote_path, e))?;
                    verify_transfer_size(&remote_path, total, transferred)?;
                    drop(remote_file);
                    if let Some(remote_size) = sftp
                        .stat(Path::new(&remote_path))
                        .ok()
                        .and_then(|stat| stat.size)
                    {
                        verify_transfer_size(&remote_path, total, remote_size)?;
                    }
                    Ok(())
                })();

                match result {
                    Ok(()) => uploaded += 1,
                    Err(error) if error.code == "canceled" => return Err(error),
                    Err(error) => failed.push(SftpUploadFailure {
                        remote_path,
                        error: error.message,
                    }),
                }
            }

            Ok(SftpUploadSummary { uploaded, failed })
        })
    })();
    finish_sftp_task(&state, &task_id);
    result
}

#[tauri::command]
pub async fn sftp_upload_paths(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    files: Vec<SftpPathUploadItem>,
    task_id: String,
) -> SftpResult<SftpUploadSummary> {
    let session_key = connection.session_key();
    let cancel_flag = register_sftp_task(&state, &task_id)?;
    let queue = get_sftp_task_queue(&state, &session_key)?;
    let result = (|| -> SftpResult<SftpUploadSummary> {
        let _queue_guard = queue
            .lock()
            .map_err(|e| format!("sftp task queue lock err: {}", e))?;
        check_sftp_task_cancelled(&cancel_flag)?;
        with_sftp(&state, &connection, |sftp| {
            let mut uploaded = 0usize;
            let mut failed = Vec::new();

            for file in files {
                check_sftp_task_cancelled(&cancel_flag)?;
                let remote_path = normalize_remote_path(&file.remote_path);
                let result = (|| -> SftpResult<()> {
                    ensure_sftp_directory(sftp, &parent_remote_path(&remote_path))?;
                    let mut local_file = File::open(&file.local_path)
                        .map_err(|e| format!("open local file {} err: {}", file.local_path, e))?;
                    let total = local_file
                        .metadata()
                        .map(|metadata| metadata.len())
                        .unwrap_or(0);
                    let mut remote_file = sftp
                        .create(Path::new(&remote_path))
                        .map_err(|e| format!("create remote file {} err: {}", remote_path, e))?;
                    emit_sftp_progress(
                        &app,
                        &task_id,
                        &session_key,
                        "upload",
                        &remote_path,
                        0,
                        total,
                        0,
                    );
                    let transferred = copy_with_progress(
                        &mut local_file,
                        &mut remote_file,
                        total,
                        &cancel_flag,
                        |transferred| {
                            emit_sftp_progress(
                                &app,
                                &task_id,
                                &session_key,
                                "upload",
                                &remote_path,
                                transferred,
                                total,
                                0,
                            );
                        },
                        SFTP_COPY_BUFFER_SIZE,
                    )
                    .map_err(|e| format!("stream upload {} err: {}", remote_path, e))?;
                    verify_transfer_size(&remote_path, total, transferred)?;
                    drop(remote_file);
                    if let Some(remote_size) = sftp
                        .stat(Path::new(&remote_path))
                        .ok()
                        .and_then(|stat| stat.size)
                    {
                        verify_transfer_size(&remote_path, total, remote_size)?;
                    }
                    Ok(())
                })();

                match result {
                    Ok(()) => uploaded += 1,
                    Err(error) if error.code == "canceled" => return Err(error),
                    Err(error) => failed.push(SftpUploadFailure {
                        remote_path,
                        error: error.message,
                    }),
                }
            }

            Ok(SftpUploadSummary { uploaded, failed })
        })
    })();
    finish_sftp_task(&state, &task_id);
    result
}

#[tauri::command]
pub async fn sftp_download(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    remote_path: String,
    task_id: String,
) -> SftpResult<String> {
    let remote_path = normalize_remote_path(&remote_path);
    let session_key = connection.session_key();
    let cancel_flag = register_sftp_task(&state, &task_id)?;
    let queue = get_sftp_task_queue(&state, &session_key)?;
    let result = (|| -> SftpResult<String> {
        let _queue_guard = queue
            .lock()
            .map_err(|e| format!("sftp task queue lock err: {}", e))?;
        check_sftp_task_cancelled(&cancel_flag)?;
        with_sftp(&state, &connection, |sftp| {
            let mut remote_file = sftp
                .open(Path::new(&remote_path))
                .map_err(|e| format!("open remote file err: {}", e))?;
            let total = sftp
                .stat(Path::new(&remote_path))
                .ok()
                .and_then(|stat| stat.size)
                .unwrap_or(0);
            let mut buf = Vec::new();
            emit_sftp_progress(
                &app,
                &task_id,
                &session_key,
                "download",
                &remote_path,
                0,
                total,
                0,
            );
            let transferred = copy_with_progress(
                &mut remote_file,
                &mut buf,
                total,
                &cancel_flag,
                |transferred| {
                    emit_sftp_progress(
                        &app,
                        &task_id,
                        &session_key,
                        "download",
                        &remote_path,
                        transferred,
                        total,
                        0,
                    );
                },
                SFTP_COPY_BUFFER_SIZE,
            )
            .map_err(|e| format!("stream download {} err: {}", remote_path, e))?;
            verify_transfer_size(&remote_path, total, transferred)?;
            verify_transfer_size(&remote_path, total, buf.len() as u64)?;
            Ok(STANDARD.encode(&buf))
        })
    })();
    finish_sftp_task(&state, &task_id);
    result
}

#[tauri::command]
pub async fn sftp_download_to_path(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    remote_path: String,
    local_path: String,
    task_id: String,
) -> SftpResult<()> {
    let remote_path = normalize_remote_path(&remote_path);
    let session_key = connection.session_key();
    let cancel_flag = register_sftp_task(&state, &task_id)?;
    let queue = get_sftp_task_queue(&state, &session_key)?;
    let result = (|| -> SftpResult<()> {
        let _queue_guard = queue
            .lock()
            .map_err(|e| format!("sftp task queue lock err: {}", e))?;
        check_sftp_task_cancelled(&cancel_flag)?;
        with_sftp(&state, &connection, |sftp| {
            let mut remote_file = sftp
                .open(Path::new(&remote_path))
                .map_err(|e| format!("open remote file err: {}", e))?;
            let total = sftp
                .stat(Path::new(&remote_path))
                .ok()
                .and_then(|stat| stat.size)
                .unwrap_or(0);
            let mut local_file = File::create(&local_path)
                .map_err(|e| format!("create local file {} err: {}", local_path, e))?;
            emit_sftp_progress(
                &app,
                &task_id,
                &session_key,
                "download",
                &remote_path,
                0,
                total,
                0,
            );
            let transferred = copy_with_progress(
                &mut remote_file,
                &mut local_file,
                total,
                &cancel_flag,
                |transferred| {
                    emit_sftp_progress(
                        &app,
                        &task_id,
                        &session_key,
                        "download",
                        &remote_path,
                        transferred,
                        total,
                        0,
                    );
                },
                SFTP_COPY_BUFFER_SIZE,
            )
            .map_err(|e| format!("stream download {} err: {}", remote_path, e))?;
            verify_transfer_size(&remote_path, total, transferred)?;
            drop(local_file);
            let local_size = std::fs::metadata(&local_path)
                .map_err(|e| format!("stat local file {} err: {}", local_path, e))?
                .len();
            verify_transfer_size(&remote_path, total, local_size)?;
            Ok(())
        })
    })();
    finish_sftp_task(&state, &task_id);
    result
}

#[tauri::command]
pub async fn sftp_mkdir(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    remote_path: String,
) -> SftpResult<()> {
    let remote_path = normalize_remote_path(&remote_path);
    with_sftp(&state, &connection, |sftp| {
        sftp.mkdir(Path::new(&remote_path), 0o755)
            .map_err(|e| format!("mkdir {} err: {}", remote_path, e))?;
        Ok(())
    })
}

#[tauri::command]
pub async fn sftp_mkdir_p(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    remote_path: String,
) -> SftpResult<()> {
    let remote_path = normalize_remote_path(&remote_path);
    with_sftp(&state, &connection, |sftp| {
        ensure_sftp_directory(sftp, &remote_path)
    })
}

#[tauri::command]
pub async fn sftp_rename(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    old_path: String,
    new_path: String,
) -> SftpResult<()> {
    let old_path = normalize_remote_path(&old_path);
    let new_path = normalize_remote_path(&new_path);
    with_sftp(&state, &connection, |sftp| {
        ensure_sftp_directory(sftp, &parent_remote_path(&new_path))?;
        sftp.rename(Path::new(&old_path), Path::new(&new_path), None)
            .map_err(|e| format!("rename {} to {} err: {}", old_path, new_path, e))?;
        Ok(())
    })
}

#[tauri::command]
pub async fn sftp_delete(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    remote_path: String,
    is_directory: Option<bool>,
) -> SftpResult<()> {
    let remote_path = normalize_remote_path(&remote_path);
    with_sftp(&state, &connection, |sftp| {
        if is_directory.unwrap_or(false) {
            sftp.rmdir(Path::new(&remote_path))
                .map_err(|e| format!("rmdir {} err: {}", remote_path, e))?;
        } else {
            sftp.unlink(Path::new(&remote_path))
                .map_err(|e| format!("unlink {} err: {}", remote_path, e))?;
        }
        Ok(())
    })
}

#[tauri::command]
pub async fn sftp_delete_recursive(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    remote_path: String,
    task_id: String,
) -> SftpResult<()> {
    let remote_path = normalize_remote_path(&remote_path);
    let session_key = connection.session_key();
    let cancel_flag = register_sftp_task(&state, &task_id)?;
    let queue = get_sftp_task_queue(&state, &session_key)?;
    let result = (|| -> SftpResult<()> {
        let _queue_guard = queue
            .lock()
            .map_err(|e| format!("sftp task queue lock err: {}", e))?;
        check_sftp_task_cancelled(&cancel_flag)?;
        with_sftp(&state, &connection, |sftp| {
            let mut deleted = 0u64;
            emit_sftp_progress(
                &app,
                &task_id,
                &session_key,
                "delete",
                &remote_path,
                0,
                0,
                deleted,
            );
            delete_recursive(
                sftp,
                &remote_path,
                &cancel_flag,
                &mut deleted,
                &mut |path, count| {
                    emit_sftp_progress(&app, &task_id, &session_key, "delete", path, 0, 0, count);
                },
            )
        })
    })();
    finish_sftp_task(&state, &task_id);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_root() {
        assert_eq!(normalize_remote_path("/"), "/");
    }

    #[test]
    fn normalize_simple_path() {
        assert_eq!(normalize_remote_path("/home/user"), "/home/user");
    }

    #[test]
    fn normalize_parent_refs() {
        assert_eq!(normalize_remote_path("/home/user/../../var"), "/var");
    }

    #[test]
    fn normalize_dot_segments() {
        assert_eq!(normalize_remote_path("/home/./user/./"), "/home/user");
    }

    #[test]
    fn normalize_double_slash() {
        assert_eq!(normalize_remote_path("home//user"), "/home/user");
    }

    #[test]
    fn normalize_parent_past_root() {
        assert_eq!(normalize_remote_path("/./../.."), "/");
    }

    #[test]
    fn normalize_windows_backslash() {
        assert_eq!(normalize_remote_path("\\\\home\\\\user"), "/home/user");
    }

    #[test]
    fn join_remote_path_basic() {
        assert_eq!(join_remote_path("/home", "user"), "/home/user");
    }

    #[test]
    fn join_remote_path_root() {
        assert_eq!(join_remote_path("/", "etc"), "/etc");
    }

    #[test]
    fn join_remote_path_dot_prefix() {
        assert_eq!(
            join_remote_path("/home/user", "./config"),
            "/home/user/config"
        );
    }

    #[test]
    fn join_remote_path_trailing_slash() {
        assert_eq!(join_remote_path("/home/", "user"), "/home/user");
    }

    #[test]
    fn parent_remote_path_simple() {
        assert_eq!(parent_remote_path("/home/user"), "/home");
    }

    #[test]
    fn parent_remote_path_root() {
        assert_eq!(parent_remote_path("/"), "/");
    }

    #[test]
    fn parent_remote_path_top_level() {
        assert_eq!(parent_remote_path("/home"), "/");
    }

    #[test]
    fn sftp_session_key_format() {
        let key = sftp_session_key("example.com", 22, "admin");
        assert_eq!(key, "admin@example.com:22");
    }

    #[test]
    fn sftp_error_from_string() {
        let err: SftpError = "auth failed".to_string().into();
        assert_eq!(err.code, "auth_failed");
        assert!(!err.recoverable);
    }

    #[test]
    fn sftp_error_from_canceled() {
        let err: SftpError = "task canceled by user".to_string().into();
        assert_eq!(err.code, "canceled");
        assert!(err.recoverable);
    }

    #[test]
    fn sftp_error_details_contains_path() {
        let err = SftpError::size_mismatch("/tmp/file.txt", 10, 8);
        assert_eq!(
            err.details.get("path").and_then(|value| value.as_str()),
            Some("/tmp/file.txt")
        );
    }

    #[test]
    fn sftp_connection_args_session_key() {
        let connection = SftpConnectionArgs {
            host: "example.com".to_string(),
            port: 2222,
            username: "admin".to_string(),
            password: None,
            private_key_path: None,
            passphrase: None,
        };
        assert_eq!(connection.session_key(), "admin@example.com:2222");
    }
}
