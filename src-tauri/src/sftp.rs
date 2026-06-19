use crate::config;
use crate::sessions::AppState;
use crate::sftp_error::{SftpError, SftpResult};
use crate::sftp_path::{join_remote_path, normalize_remote_path, parent_remote_path};
use crate::sftp_session::{remove_sftp_session_state, with_sftp, SftpConnectionArgs};
use crate::sftp_task::{
    check_sftp_task_cancelled, emit_sftp_progress, emit_sftp_progress_with_rate, finish_sftp_task,
    get_sftp_task_queue, register_sftp_task, SftpUploadFailure, SftpUploadSummary,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File},
    io::{Cursor, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    time::Instant,
};
use tauri::State;

pub(crate) use crate::sftp_session::sftp_session_key;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpEntry {
    name: String,
    path: String,
    size: String,
    size_bytes: u64,
    modified: u64,
    is_directory: bool,
    is_symlink: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpListPage {
    entries: Vec<SftpEntry>,
    offset: usize,
    limit: usize,
    total: usize,
    has_more: bool,
}

#[tauri::command]
pub async fn sftp_list(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    path: String,
) -> SftpResult<Vec<SftpEntry>> {
    let remote_path = normalize_remote_path(&path);
    with_sftp(&state, &connection, |sftp| {
        read_sftp_entries(sftp, &remote_path)
    })
}

#[tauri::command]
pub async fn sftp_list_page(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    path: String,
    offset: Option<usize>,
    limit: Option<usize>,
) -> SftpResult<SftpListPage> {
    let remote_path = normalize_remote_path(&path);
    let offset = offset.unwrap_or(0);
    let limit = limit.unwrap_or(500).clamp(1, 5000);
    with_sftp(&state, &connection, |sftp| {
        let entries = read_sftp_entries(sftp, &remote_path)?;
        let total = entries.len();
        let page_entries = entries
            .into_iter()
            .skip(offset)
            .take(limit)
            .collect::<Vec<_>>();
        let returned = page_entries.len();
        Ok(SftpListPage {
            entries: page_entries,
            offset,
            limit,
            total,
            has_more: offset + returned < total,
        })
    })
}

fn read_sftp_entries(sftp: &ssh2::Sftp, remote_path: &str) -> SftpResult<Vec<SftpEntry>> {
    let entries = sftp
        .readdir(Path::new(remote_path))
        .map_err(|e| format!("readdir {} err: {}", remote_path, e))?;
    let mut out: Vec<SftpEntry> = Vec::new();

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
        let full_path = join_remote_path(remote_path, &name);
        out.push(SftpEntry {
            name,
            path: full_path,
            size: format!("{} bytes", size),
            size_bytes: size,
            modified,
            is_directory: stat.is_dir(),
            is_symlink,
        });
    }

    out.sort_by(|left, right| {
        right
            .is_directory
            .cmp(&left.is_directory)
            .then_with(|| left.name.cmp(&right.name))
    });
    Ok(out)
}

#[tauri::command]
pub async fn set_sftp_idle_timeout(state: State<'_, AppState>, seconds: u64) -> SftpResult<()> {
    state.sftp_idle_timeout_secs.store(
        config::normalize_sftp_idle_timeout_secs(seconds),
        Ordering::Relaxed,
    );
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

#[tauri::command]
pub async fn disconnect_sftp_session(
    state: State<'_, AppState>,
    host: String,
    port: u16,
    username: String,
) -> SftpResult<()> {
    let key = sftp_session_key(&host, port, &username);
    remove_sftp_session_state(&state, &key);
    Ok(())
}

fn ensure_safe_recursive_delete_path(remote_path: &str) -> SftpResult<String> {
    let normalized = normalize_remote_path(remote_path);
    let lower = normalized.to_lowercase();
    let dangerous = normalized == "/"
        || normalized == "~"
        || lower == "/home"
        || lower.starts_with("/home/") && lower.matches('/').count() <= 2
        || lower == "/etc"
        || lower == "/usr"
        || lower == "/var"
        || lower == "/bin"
        || lower == "/sbin"
        || lower == "/opt"
        || lower.contains('*')
        || lower.contains('?');

    if dangerous {
        return Err(SftpError::new(
            "dangerous_remote_path",
            format!(
                "refusing recursive delete for protected path: {}",
                normalized
            ),
            false,
        )
        .with_detail("path", normalized));
    }
    Ok(normalized)
}

fn validate_local_file_path(path: &str, operation: &str) -> SftpResult<PathBuf> {
    let local_path = PathBuf::from(path);
    if local_path.as_os_str().is_empty() {
        return Err(SftpError::new(
            "invalid_local_path",
            format!("{} local path is empty", operation),
            false,
        ));
    }
    if local_path
        .components()
        .any(|component| matches!(component, std::path::Component::ParentDir))
    {
        return Err(SftpError::new(
            "invalid_local_path",
            format!("{} local path must not contain parent traversal", operation),
            false,
        )
        .with_detail("path", path.to_string()));
    }
    Ok(local_path)
}

fn validate_local_upload_path(path: &str) -> SftpResult<PathBuf> {
    let local_path = validate_local_file_path(path, "upload")?;
    let metadata = fs::symlink_metadata(&local_path)
        .map_err(|e| format!("stat local file {} err: {}", local_path.display(), e))?;
    if metadata.file_type().is_symlink() {
        return Err(SftpError::new(
            "local_symlink_forbidden",
            "refusing to upload a symbolic link",
            false,
        )
        .with_detail("path", local_path.display().to_string()));
    }
    if !metadata.is_file() {
        return Err(SftpError::new(
            "invalid_local_path",
            "upload path must be a regular file",
            false,
        )
        .with_detail("path", local_path.display().to_string()));
    }
    Ok(local_path)
}

fn validate_local_download_path(path: &str) -> SftpResult<PathBuf> {
    let local_path = validate_local_file_path(path, "download")?;
    if let Some(parent) = local_path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            return Err(SftpError::new(
                "invalid_local_path",
                "download parent directory does not exist",
                false,
            )
            .with_detail("path", parent.display().to_string()));
        }
    }
    if local_path.exists() {
        let metadata = fs::symlink_metadata(&local_path)
            .map_err(|e| format!("stat local file {} err: {}", local_path.display(), e))?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err(SftpError::new(
                "invalid_local_path",
                "download target must be a regular file when it already exists",
                false,
            )
            .with_detail("path", local_path.display().to_string()));
        }
    }
    Ok(local_path)
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

#[derive(Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum SftpConflictPolicy {
    Overwrite,
    Skip,
    Resume,
    Rename,
    Newer,
}

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpTransferOptions {
    #[serde(default = "default_conflict_policy")]
    conflict_policy: SftpConflictPolicy,
    #[serde(default)]
    resume: bool,
}

fn default_conflict_policy() -> SftpConflictPolicy {
    SftpConflictPolicy::Overwrite
}

impl Default for SftpTransferOptions {
    fn default() -> Self {
        Self {
            conflict_policy: default_conflict_policy(),
            resume: false,
        }
    }
}

enum TransferDecision {
    Write { path: String, offset: u64 },
    Skip,
}

fn next_available_remote_path(sftp: &ssh2::Sftp, remote_path: &str) -> String {
    let normalized = normalize_remote_path(remote_path);
    let slash = normalized.rfind('/').unwrap_or(0);
    let (dir, file) = normalized.split_at(slash + 1);
    let name = file.trim_start_matches('/');
    let (stem, ext) = name
        .rsplit_once('.')
        .map(|(left, right)| (left.to_string(), format!(".{right}")))
        .unwrap_or_else(|| (name.to_string(), String::new()));

    for index in 1..1000 {
        let candidate = format!("{dir}{stem} ({index}){ext}");
        if sftp.stat(Path::new(&candidate)).is_err() {
            return candidate;
        }
    }
    format!("{dir}{stem} ({}){ext}", uuid::Uuid::new_v4())
}

fn resolve_remote_write_decision(
    sftp: &ssh2::Sftp,
    remote_path: &str,
    local_size: u64,
    options: SftpTransferOptions,
) -> SftpResult<TransferDecision> {
    let stat = sftp.stat(Path::new(remote_path)).ok();
    let Some(stat) = stat else {
        return Ok(TransferDecision::Write {
            path: remote_path.to_string(),
            offset: 0,
        });
    };

    let remote_size = stat.size.unwrap_or(0);
    if options.resume || options.conflict_policy == SftpConflictPolicy::Resume {
        if remote_size < local_size {
            return Ok(TransferDecision::Write {
                path: remote_path.to_string(),
                offset: remote_size,
            });
        }
        if remote_size == local_size {
            return Ok(TransferDecision::Skip);
        }
    }

    match options.conflict_policy {
        SftpConflictPolicy::Skip => Ok(TransferDecision::Skip),
        SftpConflictPolicy::Rename => Ok(TransferDecision::Write {
            path: next_available_remote_path(sftp, remote_path),
            offset: 0,
        }),
        SftpConflictPolicy::Newer => Err(SftpError::new(
            "conflict_requires_metadata",
            "newer-only upload requires comparable modified timestamps",
            false,
        )
        .with_detail("path", remote_path.to_string())),
        SftpConflictPolicy::Overwrite | SftpConflictPolicy::Resume => Ok(TransferDecision::Write {
            path: remote_path.to_string(),
            offset: 0,
        }),
    }
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
    initial_transferred: u64,
    cancel_flag: &AtomicBool,
    mut on_progress: impl FnMut(u64, Option<u64>),
    buffer_size: usize,
) -> Result<u64, String> {
    let mut buf = vec![0u8; buffer_size];
    let mut transferred = initial_transferred;
    let transfer_started_at = Instant::now();
    let mut last_progress_emit = Instant::now()
        .checked_sub(config::sftp_progress_emit_interval())
        .unwrap_or_else(Instant::now);
    let mut last_progress_value = 0u64;

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
        if last_progress_emit.elapsed() >= config::sftp_progress_emit_interval()
            || transferred >= total
        {
            on_progress(
                transferred,
                transfer_rate_bytes_per_second(transfer_started_at, transferred),
            );
            last_progress_emit = Instant::now();
            last_progress_value = transferred;
        }
    }

    if transferred != last_progress_value {
        on_progress(
            transferred,
            transfer_rate_bytes_per_second(transfer_started_at, transferred),
        );
    }

    Ok(transferred.max(total.min(transferred)))
}

fn transfer_rate_bytes_per_second(started_at: Instant, transferred: u64) -> Option<u64> {
    let elapsed = started_at.elapsed().as_secs_f64();
    if elapsed <= 0.0 || transferred == 0 {
        None
    } else {
        Some((transferred as f64 / elapsed).round() as u64)
    }
}

#[tauri::command]
pub async fn sftp_upload(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    connection: SftpConnectionArgs,
    remote_path: String,
    data_base64: String,
    task_id: String,
    options: Option<SftpTransferOptions>,
) -> SftpResult<()> {
    let options = options.unwrap_or_default();
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
            let TransferDecision::Write {
                path: remote_path,
                offset,
            } = resolve_remote_write_decision(sftp, &remote_path, total, options)?
            else {
                return Ok(());
            };
            let mut reader = Cursor::new(bytes);
            reader
                .seek(SeekFrom::Start(offset))
                .map_err(|e| format!("seek upload buffer err: {}", e))?;
            let mut remote_file = if offset > 0 {
                sftp.open_mode(
                    Path::new(&remote_path),
                    ssh2::OpenFlags::WRITE | ssh2::OpenFlags::APPEND,
                    0o644,
                    ssh2::OpenType::File,
                )
            } else {
                sftp.create(Path::new(&remote_path))
            }
            .map_err(|e| format!("open remote file {} err: {}", remote_path, e))?;
            emit_sftp_progress(
                &app,
                &task_id,
                &session_key,
                "upload",
                &remote_path,
                offset,
                total,
                offset,
            );
            let transferred = copy_with_progress(
                &mut reader,
                &mut remote_file,
                total,
                0,
                &cancel_flag,
                |transferred, bytes_per_second| {
                    emit_sftp_progress_with_rate(
                        &app,
                        &task_id,
                        &session_key,
                        "upload",
                        &remote_path,
                        transferred,
                        total,
                        0,
                        bytes_per_second,
                    );
                },
                config::SFTP_COPY_BUFFER_SIZE,
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
    options: Option<SftpTransferOptions>,
) -> SftpResult<SftpUploadSummary> {
    let options = options.unwrap_or_default();
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
                    let TransferDecision::Write {
                        path: remote_path,
                        offset,
                    } = resolve_remote_write_decision(sftp, &remote_path, total, options)?
                    else {
                        return Ok(());
                    };
                    let mut reader = Cursor::new(bytes);
                    reader
                        .seek(SeekFrom::Start(offset))
                        .map_err(|e| format!("seek upload buffer err: {}", e))?;
                    let mut remote_file = if offset > 0 {
                        sftp.open_mode(
                            Path::new(&remote_path),
                            ssh2::OpenFlags::WRITE | ssh2::OpenFlags::APPEND,
                            0o644,
                            ssh2::OpenType::File,
                        )
                    } else {
                        sftp.create(Path::new(&remote_path))
                    }
                    .map_err(|e| format!("open remote file {} err: {}", remote_path, e))?;
                    emit_sftp_progress(
                        &app,
                        &task_id,
                        &session_key,
                        "upload",
                        &remote_path,
                        offset,
                        total,
                        offset,
                    );
                    let transferred = copy_with_progress(
                        &mut reader,
                        &mut remote_file,
                        total,
                        0,
                        &cancel_flag,
                        |transferred, bytes_per_second| {
                            emit_sftp_progress_with_rate(
                                &app,
                                &task_id,
                                &session_key,
                                "upload",
                                &remote_path,
                                transferred,
                                total,
                                0,
                                bytes_per_second,
                            );
                        },
                        config::SFTP_COPY_BUFFER_SIZE,
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
    options: Option<SftpTransferOptions>,
) -> SftpResult<SftpUploadSummary> {
    let options = options.unwrap_or_default();
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
                    let local_path = validate_local_upload_path(&file.local_path)?;
                    let mut local_file = File::open(&local_path).map_err(|e| {
                        format!("open local file {} err: {}", local_path.display(), e)
                    })?;
                    let total = local_file
                        .metadata()
                        .map(|metadata| metadata.len())
                        .unwrap_or(0);
                    let TransferDecision::Write {
                        path: remote_path,
                        offset,
                    } = resolve_remote_write_decision(sftp, &remote_path, total, options)?
                    else {
                        return Ok(());
                    };
                    local_file.seek(SeekFrom::Start(offset)).map_err(|e| {
                        format!("seek local file {} err: {}", local_path.display(), e)
                    })?;
                    let mut remote_file = if offset > 0 {
                        sftp.open_mode(
                            Path::new(&remote_path),
                            ssh2::OpenFlags::WRITE | ssh2::OpenFlags::APPEND,
                            0o644,
                            ssh2::OpenType::File,
                        )
                    } else {
                        sftp.create(Path::new(&remote_path))
                    }
                    .map_err(|e| format!("open remote file {} err: {}", remote_path, e))?;
                    emit_sftp_progress(
                        &app,
                        &task_id,
                        &session_key,
                        "upload",
                        &remote_path,
                        offset,
                        total,
                        offset,
                    );
                    let transferred = copy_with_progress(
                        &mut local_file,
                        &mut remote_file,
                        total,
                        0,
                        &cancel_flag,
                        |transferred, bytes_per_second| {
                            emit_sftp_progress_with_rate(
                                &app,
                                &task_id,
                                &session_key,
                                "upload",
                                &remote_path,
                                transferred,
                                total,
                                0,
                                bytes_per_second,
                            );
                        },
                        config::SFTP_COPY_BUFFER_SIZE,
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
                0,
                &cancel_flag,
                |transferred, bytes_per_second| {
                    emit_sftp_progress_with_rate(
                        &app,
                        &task_id,
                        &session_key,
                        "download",
                        &remote_path,
                        transferred,
                        total,
                        0,
                        bytes_per_second,
                    );
                },
                config::SFTP_COPY_BUFFER_SIZE,
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
    options: Option<SftpTransferOptions>,
) -> SftpResult<()> {
    let options = options.unwrap_or_default();
    let remote_path = normalize_remote_path(&remote_path);
    let local_path = validate_local_download_path(&local_path)?;
    let part_path = local_path.with_extension(format!(
        "{}.part",
        local_path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("download")
    ));
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
            let write_path =
                if options.resume || options.conflict_policy == SftpConflictPolicy::Resume {
                    &local_path
                } else {
                    &part_path
                };
            let existing_size = fs::metadata(write_path)
                .map(|metadata| metadata.len())
                .unwrap_or(0);
            if options.conflict_policy == SftpConflictPolicy::Skip && existing_size > 0 {
                return Ok(());
            }
            let offset = if options.resume || options.conflict_policy == SftpConflictPolicy::Resume
            {
                existing_size.min(total)
            } else {
                0
            };
            if offset >= total && total > 0 {
                return Ok(());
            }
            let mut local_file = if offset > 0 {
                File::options().append(true).open(write_path)
            } else {
                File::create(write_path)
            }
            .map_err(|e| format!("open local file {} err: {}", write_path.display(), e))?;
            if offset > 0 {
                remote_file
                    .seek(SeekFrom::Start(offset))
                    .map_err(|e| format!("seek remote file {} err: {}", remote_path, e))?;
            }
            emit_sftp_progress(
                &app,
                &task_id,
                &session_key,
                "download",
                &remote_path,
                offset,
                total,
                offset,
            );
            let transferred = copy_with_progress(
                &mut remote_file,
                &mut local_file,
                total,
                0,
                &cancel_flag,
                |transferred, bytes_per_second| {
                    emit_sftp_progress_with_rate(
                        &app,
                        &task_id,
                        &session_key,
                        "download",
                        &remote_path,
                        transferred,
                        total,
                        0,
                        bytes_per_second,
                    );
                },
                config::SFTP_COPY_BUFFER_SIZE,
            )
            .map_err(|e| format!("stream download {} err: {}", remote_path, e))?;
            verify_transfer_size(&remote_path, total, transferred)?;
            drop(local_file);
            let local_size = fs::metadata(write_path)
                .map_err(|e| format!("stat local file {} err: {}", write_path.display(), e))?
                .len();
            verify_transfer_size(&remote_path, total, local_size)?;
            if write_path != &local_path {
                fs::rename(write_path, &local_path).map_err(|e| {
                    format!(
                        "replace local file {} with {} err: {}",
                        write_path.display(),
                        local_path.display(),
                        e
                    )
                })?;
            }
            Ok(())
        })
    })();
    finish_sftp_task(&state, &task_id);
    if result.is_err() {
        let _ = fs::remove_file(&part_path);
    }
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
    let remote_path = ensure_safe_recursive_delete_path(&remote_path)?;
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
