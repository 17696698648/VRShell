use crate::{
    domain::sftp::{SftpConnectionRequest, SftpEntry, SftpTaskSnapshot, SftpTaskStatus},
    error::{BackendError, BackendResult},
    infrastructure::{
        file_store::FileStore,
        ssh_auth::{self, SshAuthParams},
    },
    state::BackendState,
};
use base64::Engine;
use serde::Serialize;
use ssh2::{FileStat, OpenFlags, OpenType, Session as SshSession};
use std::{
    fs::{self, File},
    io::{Read, Write},
    net::{TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use crate::infrastructure::event_bus::EventSink;

const TRANSFER_BUFFER_SIZE: usize = 64 * 1024;
const MAX_PERSISTED_SFTP_TASKS: usize = 100;
const COMPLETED_SFTP_TASK_RETENTION_MS: u128 = 7 * 24 * 60 * 60 * 1000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SftpProgressEventPayload {
    task_id: String,
    kind: String,
    title: String,
    detail: String,
    transferred_bytes: u64,
    total_bytes: Option<u64>,
    bytes_per_second: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SftpFailedEventPayload {
    task_id: String,
    kind: String,
    title: String,
    detail: String,
    transferred_bytes: u64,
    total_bytes: Option<u64>,
    bytes_per_second: Option<u64>,
    error: String,
}

enum UploadSource {
    Memory(Vec<u8>),
    LocalFile(PathBuf),
}

pub(crate) fn list_sftp_tasks(state: &BackendState) -> BackendResult<Vec<SftpTaskSnapshot>> {
    let tasks = pruned_sftp_tasks(state, current_time_ms())?;
    replace_sftp_tasks(state, &tasks)?;
    FileStore::new(state.app_data_dir.clone()).save_sftp_tasks(&tasks)?;
    Ok(tasks)
}

pub(crate) fn register_sftp_task(
    state: &BackendState,
    task_id: &str,
    kind: &str,
    title: &str,
    detail: &str,
) -> BackendResult<()> {
    state
        .sftp_tasks
        .lock()
        .insert(
            task_id.to_string(),
            SftpTaskSnapshot {
                task_id: task_id.to_string(),
                kind: kind.to_string(),
                title: title.to_string(),
                detail: detail.to_string(),
                status: SftpTaskStatus::Running,
                transferred_bytes: 0,
                total_bytes: None,
                error: None,
                updated_at_ms: current_time_ms(),
                started_at_ms: Some(current_time_ms()),
            },
        );
    persist_sftp_tasks(state)
}

pub(crate) fn mark_sftp_task_cancelled(state: &BackendState, task_id: &str) -> BackendResult<()> {
    let existing = state
        .sftp_tasks
        .lock()
        .get(task_id)
        .cloned();
    record_sftp_task(
        state,
        task_id,
        SftpTaskStatus::Cancelled,
        existing.as_ref().map_or(0, |task| task.transferred_bytes),
        existing.and_then(|task| task.total_bytes),
        Some("sftp task was cancelled".to_string()),
    )
}

fn persist_sftp_tasks(state: &BackendState) -> BackendResult<()> {
    let tasks = pruned_sftp_tasks(state, current_time_ms())?;
    replace_sftp_tasks(state, &tasks)?;
    FileStore::new(state.app_data_dir.clone()).save_sftp_tasks(&tasks)
}

fn find_sftp_task(state: &BackendState, task_id: &str) -> BackendResult<Option<SftpTaskSnapshot>> {
    Ok(state
        .sftp_tasks
        .lock()
        .get(task_id)
        .cloned())
}

fn pruned_sftp_tasks(state: &BackendState, now_ms: u128) -> BackendResult<Vec<SftpTaskSnapshot>> {
    let tasks = state
        .sftp_tasks
        .lock()
        .values()
        .cloned()
        .collect::<Vec<_>>();
    Ok(prune_sftp_tasks(tasks, now_ms))
}

fn replace_sftp_tasks(state: &BackendState, tasks: &[SftpTaskSnapshot]) -> BackendResult<()> {
    let mut stored_tasks = state
        .sftp_tasks
        .lock();
    stored_tasks.clear();
    stored_tasks.extend(
        tasks
            .iter()
            .cloned()
            .map(|task| (task.task_id.clone(), task)),
    );
    Ok(())
}

fn prune_sftp_tasks(mut tasks: Vec<SftpTaskSnapshot>, now_ms: u128) -> Vec<SftpTaskSnapshot> {
    tasks.retain(|task| should_keep_sftp_task(task, now_ms));
    sort_sftp_tasks(&mut tasks);
    tasks.truncate(MAX_PERSISTED_SFTP_TASKS);
    tasks
}

fn should_keep_sftp_task(task: &SftpTaskSnapshot, now_ms: u128) -> bool {
    if task.status == SftpTaskStatus::Running {
        return true;
    }
    now_ms.saturating_sub(task.updated_at_ms) <= COMPLETED_SFTP_TASK_RETENTION_MS
}

fn sort_sftp_tasks(tasks: &mut [SftpTaskSnapshot]) {
    tasks.sort_by(|left, right| {
        right
            .updated_at_ms
            .cmp(&left.updated_at_ms)
            .then_with(|| right.task_id.cmp(&left.task_id))
    });
}

fn current_time_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn record_sftp_task(
    state: &BackendState,
    task_id: &str,
    status: SftpTaskStatus,
    transferred_bytes: u64,
    total_bytes: Option<u64>,
    error: Option<String>,
) -> BackendResult<()> {
    let mut tasks = state
        .sftp_tasks
        .lock();
    let existing = tasks.get(task_id).cloned();
    tasks.insert(
        task_id.to_string(),
        SftpTaskSnapshot {
            task_id: task_id.to_string(),
            kind: existing
                .as_ref()
                .map_or_else(|| "sftp".to_string(), |task| task.kind.clone()),
            title: existing
                .as_ref()
                .map_or_else(|| "SFTP transfer".to_string(), |task| task.title.clone()),
            detail: existing
                .as_ref()
                .map_or_else(|| task_id.to_string(), |task| task.detail.clone()),
            status,
            transferred_bytes,
            total_bytes,
            error,
            updated_at_ms: current_time_ms(),
            started_at_ms: existing.and_then(|task| task.started_at_ms),
        },
    );
    drop(tasks);
    persist_sftp_tasks(state)
}

pub(crate) fn list(
    connection: SftpConnectionRequest,
    path: String,
) -> BackendResult<Vec<SftpEntry>> {
    validate_connection(&connection)?;
    let path = path.trim();
    if path.is_empty() {
        return Err(BackendError::validation("path is required"));
    }

    let session = open_ssh_session(&connection)?;
    let sftp = session
        .sftp()
        .map_err(|error| BackendError::validation(format!("failed to open sftp: {error}")))?;
    let mut entries = sftp
        .readdir(Path::new(path))
        .map_err(|error| BackendError::validation(format!("failed to list sftp path: {error}")))?
        .into_iter()
        .filter_map(|(entry_path, stat)| to_entry(path, entry_path.as_path(), stat))
        .collect::<Vec<_>>();

    entries.sort_by(|left, right| {
        right
            .is_directory
            .cmp(&left.is_directory)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    Ok(entries)
}

pub(crate) fn read_file(
    connection: SftpConnectionRequest,
    remote_path: String,
) -> BackendResult<String> {
    validate_connection(&connection)?;
    let remote_path = remote_path.trim();
    if remote_path.is_empty() {
        return Err(BackendError::validation("remote path is required"));
    }

    let session = open_ssh_session(&connection)?;
    let sftp = session
        .sftp()
        .map_err(|error| BackendError::validation(format!("failed to open sftp: {error}")))?;
    let mut file = sftp.open(Path::new(remote_path)).map_err(|error| {
        BackendError::validation(format!("failed to open remote file: {error}"))
    })?;
    let mut content = Vec::new();
    file.read_to_end(&mut content).map_err(|error| {
        BackendError::validation(format!("failed to read remote file: {error}"))
    })?;
    Ok(base64::engine::general_purpose::STANDARD.encode(content))
}

pub(crate) fn mkdir(connection: SftpConnectionRequest, remote_path: String) -> BackendResult<()> {
    let remote_path = validate_remote_path(&connection, remote_path)?;
    let session = open_ssh_session(&connection)?;
    let sftp = open_sftp(&session)?;
    sftp.mkdir(Path::new(&remote_path), 0o755).map_err(|error| {
        BackendError::validation(format!("failed to create remote directory: {error}"))
    })
}

pub(crate) fn create_file(
    connection: SftpConnectionRequest,
    remote_path: String,
) -> BackendResult<()> {
    let remote_path = validate_remote_path(&connection, remote_path)?;
    let session = open_ssh_session(&connection)?;
    let sftp = open_sftp(&session)?;
    let _file = sftp
        .open_mode(
            Path::new(&remote_path),
            OpenFlags::CREATE | OpenFlags::EXCLUSIVE | OpenFlags::WRITE,
            0o644,
            OpenType::File,
        )
        .map_err(|error| {
            BackendError::validation(format!("failed to create remote file: {error}"))
        })?;
    Ok(())
}

pub(crate) fn rename(
    connection: SftpConnectionRequest,
    old_path: String,
    new_path: String,
) -> BackendResult<()> {
    let old_path = validate_remote_path(&connection, old_path)?;
    let new_path = validate_remote_path(&connection, new_path)?;
    let session = open_ssh_session(&connection)?;
    let sftp = open_sftp(&session)?;
    sftp.rename(Path::new(&old_path), Path::new(&new_path), None)
        .map_err(|error| BackendError::validation(format!("failed to rename remote path: {error}")))
}

pub(crate) fn delete(
    connection: SftpConnectionRequest,
    remote_path: String,
    is_directory: Option<bool>,
) -> BackendResult<()> {
    let remote_path = validate_remote_path(&connection, remote_path)?;
    let session = open_ssh_session(&connection)?;
    let sftp = open_sftp(&session)?;
    let is_directory = match is_directory {
        Some(value) => value,
        None => sftp
            .stat(Path::new(&remote_path))
            .map_err(|error| {
                BackendError::validation(format!("failed to stat remote path: {error}"))
            })?
            .is_dir(),
    };

    if is_directory {
        sftp.rmdir(Path::new(&remote_path)).map_err(|error| {
            BackendError::validation(format!("failed to delete remote directory: {error}"))
        })
    } else {
        sftp.unlink(Path::new(&remote_path)).map_err(|error| {
            BackendError::validation(format!("failed to delete remote file: {error}"))
        })
    }
}

pub(crate) fn upload_file_with_progress(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    connection: SftpConnectionRequest,
    remote_path: String,
    data_base64: Option<String>,
    local_path: Option<String>,
) -> BackendResult<()> {
    tracing::info!(task_id = ?task_id, remote_path = %remote_path, "starting SFTP upload");
    let remote_path = validate_remote_path(&connection, remote_path)?;
    let upload_source = match (data_base64, local_path) {
        (Some(data_base64), _) => UploadSource::Memory(
            base64::engine::general_purpose::STANDARD
                .decode(data_base64)
                .map_err(|error| {
                    BackendError::validation(format!("failed to decode upload data: {error}"))
                })?,
        ),
        (None, Some(local_path)) => UploadSource::LocalFile(PathBuf::from(local_path)),
        (None, None) => {
            return Err(BackendError::validation(
                "upload data or local path is required",
            ))
        }
    };

    let session = open_ssh_session(&connection)?;
    let sftp = open_sftp(&session)?;
    let mut file = sftp
        .open_mode(
            Path::new(&remote_path),
            OpenFlags::CREATE | OpenFlags::TRUNCATE | OpenFlags::WRITE,
            0o644,
            OpenType::File,
        )
        .map_err(|error| {
            BackendError::validation(format!("failed to open remote file for upload: {error}"))
        })?;
    write_upload_source_with_progress(window, state, task_id, &mut file, upload_source)
}

pub(crate) fn download_file_with_progress(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    connection: SftpConnectionRequest,
    remote_path: String,
    local_path: Option<String>,
) -> BackendResult<String> {
    tracing::info!(task_id = ?task_id, remote_path = %remote_path, "starting SFTP download");
    let remote_path = validate_remote_path(&connection, remote_path)?;
    let session = open_ssh_session(&connection)?;
    let sftp = open_sftp(&session)?;
    let total_bytes = sftp
        .stat(Path::new(&remote_path))
        .ok()
        .and_then(|stat| stat.size);
    let mut remote_file = sftp.open(Path::new(&remote_path)).map_err(|error| {
        BackendError::validation(format!("failed to open remote file: {error}"))
    })?;
    if let Some(local_path) = local_path {
        write_download_to_local_file_with_progress(
            window,
            state,
            task_id,
            &mut remote_file,
            PathBuf::from(&local_path),
            total_bytes,
        )?;
        Ok(local_path)
    } else {
        let mut content = Vec::new();
        read_to_end_with_progress(
            window,
            state,
            task_id,
            &mut remote_file,
            &mut content,
            total_bytes,
        )?;
        Ok(base64::engine::general_purpose::STANDARD.encode(content))
    }
}

pub(crate) fn upload_directory_with_progress(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    connection: SftpConnectionRequest,
    local_path: String,
    remote_path: String,
) -> BackendResult<()> {
    let remote_path = validate_remote_path(&connection, remote_path)?;
    let local_path = PathBuf::from(local_path);
    if !local_path.is_dir() {
        return Err(BackendError::validation("local path must be a directory"));
    }
    let total_bytes = calculate_directory_size(&local_path)?;

    let session = open_ssh_session(&connection)?;
    let sftp = open_sftp(&session)?;
    ensure_remote_directory(&sftp, Path::new(&remote_path))?;
    let mut transferred = 0_u64;
    emit_sftp_progress(state, window, task_id, transferred, Some(total_bytes));
    upload_directory_entries(
        window,
        state,
        task_id,
        &sftp,
        &local_path,
        &remote_path,
        total_bytes,
        &mut transferred,
    )?;
    emit_sftp_completed(state, window, task_id, transferred, Some(total_bytes));
    Ok(())
}

fn open_ssh_session(request: &SftpConnectionRequest) -> BackendResult<SshSession> {
    let address = (request.host.as_str(), request.port)
        .to_socket_addrs()
        .map_err(|error| BackendError::validation(format!("failed to resolve host: {error}")))?
        .next()
        .ok_or_else(|| BackendError::validation("host did not resolve to an address"))?;
    let stream =
        TcpStream::connect_timeout(&address, Duration::from_secs(12)).map_err(|error| {
            BackendError::validation(format!("failed to connect ssh socket: {error}"))
        })?;
    stream
        .set_read_timeout(Some(Duration::from_secs(12)))
        .map_err(|error| {
            BackendError::validation(format!("failed to configure ssh socket: {error}"))
        })?;
    stream
        .set_write_timeout(Some(Duration::from_secs(12)))
        .map_err(|error| {
            BackendError::validation(format!("failed to configure ssh socket: {error}"))
        })?;

    let mut session = SshSession::new().map_err(|error| {
        BackendError::validation(format!("failed to create ssh session: {error}"))
    })?;
    session.set_tcp_stream(stream);
    session
        .handshake()
        .map_err(|error| BackendError::validation(format!("ssh handshake failed: {error}")))?;
    authenticate(&session, request)?;
    Ok(session)
}

fn write_upload_source_with_progress<W: Write>(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    writer: &mut W,
    source: UploadSource,
) -> BackendResult<()> {
    match source {
        UploadSource::Memory(data) => {
            write_memory_with_progress(window, state, task_id, writer, &data)
        }
        UploadSource::LocalFile(path) => {
            write_local_file_with_progress(window, state, task_id, writer, path)
        }
    }
}

fn write_memory_with_progress<W: Write>(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    writer: &mut W,
    data: &[u8],
) -> BackendResult<()> {
    let total_bytes = data.len() as u64;
    let mut transferred = 0_u64;
    emit_sftp_progress(state, window, task_id, transferred, Some(total_bytes));

    for chunk in data.chunks(TRANSFER_BUFFER_SIZE) {
        ensure_task_not_cancelled(state, task_id)?;
        write_remote_chunk(writer, chunk)?;
        transferred += chunk.len() as u64;
        emit_sftp_progress(state, window, task_id, transferred, Some(total_bytes));
    }

    emit_sftp_completed(state, window, task_id, transferred, Some(total_bytes));
    Ok(())
}

fn write_local_file_with_progress<W: Write>(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    writer: &mut W,
    path: PathBuf,
) -> BackendResult<()> {
    let mut file = File::open(&path)
        .map_err(|error| BackendError::storage(format!("failed to read local file: {error}")))?;
    let total_bytes = file.metadata().ok().map(|metadata| metadata.len());
    let mut transferred = 0_u64;
    let mut buffer = [0_u8; TRANSFER_BUFFER_SIZE];
    emit_sftp_progress(state, window, task_id, transferred, total_bytes);

    loop {
        ensure_task_not_cancelled(state, task_id)?;
        let count = file.read(&mut buffer).map_err(|error| {
            BackendError::storage(format!("failed to read local file: {error}"))
        })?;
        if count == 0 {
            break;
        }
        write_remote_chunk(writer, &buffer[..count])?;
        transferred += count as u64;
        emit_sftp_progress(state, window, task_id, transferred, total_bytes);
    }

    emit_sftp_completed(state, window, task_id, transferred, total_bytes);
    Ok(())
}

fn write_remote_chunk<W: Write>(writer: &mut W, chunk: &[u8]) -> BackendResult<()> {
    writer
        .write_all(chunk)
        .map_err(|error| BackendError::validation(format!("failed to write remote file: {error}")))
}

fn read_to_end_with_progress<R: Read>(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    reader: &mut R,
    output: &mut Vec<u8>,
    total_bytes: Option<u64>,
) -> BackendResult<()> {
    let mut transferred = 0_u64;
    let mut buffer = [0_u8; TRANSFER_BUFFER_SIZE];
    emit_sftp_progress(state, window, task_id, transferred, total_bytes);

    loop {
        ensure_task_not_cancelled(state, task_id)?;
        let count = reader.read(&mut buffer).map_err(|error| {
            BackendError::validation(format!("failed to read remote file: {error}"))
        })?;
        if count == 0 {
            break;
        }
        output.extend_from_slice(&buffer[..count]);
        transferred += count as u64;
        emit_sftp_progress(state, window, task_id, transferred, total_bytes);
    }

    emit_sftp_completed(state, window, task_id, transferred, total_bytes);
    Ok(())
}

fn write_download_to_local_file_with_progress<R: Read>(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    reader: &mut R,
    local_path: PathBuf,
    total_bytes: Option<u64>,
) -> BackendResult<()> {
    if let Some(parent) = local_path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            BackendError::storage(format!("failed to create local directory: {error}"))
        })?;
    }

    let mut output_file = File::create(&local_path)
        .map_err(|error| BackendError::storage(format!("failed to write local file: {error}")))?;
    let mut transferred = 0_u64;
    let mut buffer = [0_u8; TRANSFER_BUFFER_SIZE];
    emit_sftp_progress(state, window, task_id, transferred, total_bytes);

    loop {
        ensure_task_not_cancelled(state, task_id)?;
        let count = reader.read(&mut buffer).map_err(|error| {
            BackendError::validation(format!("failed to read remote file: {error}"))
        })?;
        if count == 0 {
            break;
        }
        output_file.write_all(&buffer[..count]).map_err(|error| {
            BackendError::storage(format!("failed to write local file: {error}"))
        })?;
        transferred += count as u64;
        emit_sftp_progress(state, window, task_id, transferred, total_bytes);
    }

    emit_sftp_completed(state, window, task_id, transferred, total_bytes);
    Ok(())
}

fn ensure_task_not_cancelled(
    state: Option<&BackendState>,
    task_id: Option<&str>,
) -> BackendResult<()> {
    let (Some(state), Some(task_id)) = (state, task_id) else {
        return Ok(());
    };
    let cancelled = state
        .cancelled_sftp_tasks
        .lock()
        .contains(task_id);
    if cancelled {
        Err(BackendError::validation("sftp task was cancelled"))
    } else {
        Ok(())
    }
}

fn emit_sftp_progress(
    state: Option<&BackendState>,
    window: Option<&impl EventSink>,
    task_id: Option<&str>,
    transferred_bytes: u64,
    total_bytes: Option<u64>,
) {
    let Some(task_id) = task_id else {
        return;
    };
    let snapshot = if let Some(state) = state {
        let _ = record_sftp_task(
            state,
            task_id,
            SftpTaskStatus::Running,
            transferred_bytes,
            total_bytes,
            None,
        );
        find_sftp_task(state, task_id).ok().flatten()
    } else {
        None
    };
    let Some(window) = window else {
        return;
    };
    let _ = window.emit_event(
        crate::ipc::events::SFTP_PROGRESS,
        sftp_progress_payload(task_id, snapshot.as_ref(), transferred_bytes, total_bytes),
    );
}

fn emit_sftp_completed(
    state: Option<&BackendState>,
    window: Option<&impl EventSink>,
    task_id: Option<&str>,
    transferred_bytes: u64,
    total_bytes: Option<u64>,
) {
    let Some(task_id) = task_id else {
        return;
    };
    let snapshot = if let Some(state) = state {
        let _ = record_sftp_task(
            state,
            task_id,
            SftpTaskStatus::Done,
            transferred_bytes,
            total_bytes,
            None,
        );
        find_sftp_task(state, task_id).ok().flatten()
    } else {
        None
    };
    let Some(window) = window else {
        return;
    };
    let _ = window.emit_event(
        crate::ipc::events::SFTP_COMPLETED,
        sftp_progress_payload(task_id, snapshot.as_ref(), transferred_bytes, total_bytes),
    );
}

fn sftp_progress_payload(
    task_id: &str,
    snapshot: Option<&SftpTaskSnapshot>,
    transferred_bytes: u64,
    total_bytes: Option<u64>,
) -> SftpProgressEventPayload {
    let bytes_per_second = snapshot
        .and_then(|task| task.started_at_ms)
        .and_then(|started_at| {
            let elapsed_ms = current_time_ms().saturating_sub(started_at);
            if elapsed_ms > 0 {
                Some(transferred_bytes * 1000 / elapsed_ms as u64)
            } else {
                None
            }
        });
    SftpProgressEventPayload {
        task_id: task_id.to_string(),
        kind: snapshot.map_or_else(|| "sftp".to_string(), |task| task.kind.clone()),
        title: snapshot.map_or_else(|| "SFTP transfer".to_string(), |task| task.title.clone()),
        detail: snapshot.map_or_else(|| task_id.to_string(), |task| task.detail.clone()),
        transferred_bytes,
        total_bytes,
        bytes_per_second,
    }
}

pub(crate) fn emit_sftp_failed(
    state: Option<&BackendState>,
    window: &impl EventSink,
    task_id: &str,
    error: impl Into<String>,
) {
    let error = error.into();
    let snapshot = if let Some(state) = state {
        let _ = record_sftp_task(
            state,
            task_id,
            SftpTaskStatus::Failed,
            0,
            None,
            Some(error.clone()),
        );
        find_sftp_task(state, task_id).ok().flatten()
    } else {
        None
    };
    let _ = window.emit_event(
        crate::ipc::events::SFTP_FAILED,
        SftpFailedEventPayload {
            task_id: task_id.to_string(),
            kind: snapshot
                .as_ref()
                .map_or_else(|| "sftp".to_string(), |task| task.kind.clone()),
            title: snapshot
                .as_ref()
                .map_or_else(|| "SFTP transfer".to_string(), |task| task.title.clone()),
            detail: snapshot
                .as_ref()
                .map_or_else(|| task_id.to_string(), |task| task.detail.clone()),
            transferred_bytes: snapshot.as_ref().map_or(0, |task| task.transferred_bytes),
            total_bytes: snapshot.as_ref().and_then(|task| task.total_bytes),
            bytes_per_second: None,
            error,
        },
    );
}

fn authenticate(session: &SshSession, request: &SftpConnectionRequest) -> BackendResult<()> {
    let params = SshAuthParams {
        username: request.username.clone(),
        password: request.password.clone(),
        private_key_path: request.private_key_path.clone(),
        passphrase: request.passphrase.clone(),
        auth_method: request.auth_method.clone(),
        credential_ref: request.credential_ref.clone(),
    };
    ssh_auth::authenticate_with_inferred_method(session, &params)
}

fn open_sftp(session: &SshSession) -> BackendResult<ssh2::Sftp> {
    session
        .sftp()
        .map_err(|error| BackendError::validation(format!("failed to open sftp: {error}")))
}

fn validate_remote_path(
    connection: &SftpConnectionRequest,
    remote_path: String,
) -> BackendResult<String> {
    validate_connection(connection)?;
    let remote_path = remote_path.trim();
    if remote_path.is_empty() {
        return Err(BackendError::validation("remote path is required"));
    }
    if !remote_path.starts_with('/') {
        return Err(BackendError::validation("remote path must be absolute"));
    }
    Ok(remote_path.to_string())
}

fn ensure_remote_directory(sftp: &ssh2::Sftp, remote_path: &Path) -> BackendResult<()> {
    if sftp.stat(remote_path).is_ok() {
        return Ok(());
    }
    if let Some(parent) = remote_path
        .parent()
        .filter(|parent| parent != &Path::new(""))
    {
        ensure_remote_directory(sftp, parent)?;
    }
    sftp.mkdir(remote_path, 0o755).map_err(|error| {
        BackendError::validation(format!("failed to create remote directory: {error}"))
    })
}

fn calculate_directory_size(local_directory: &Path) -> BackendResult<u64> {
    let mut total_bytes = 0_u64;
    for entry in fs::read_dir(local_directory).map_err(|error| {
        BackendError::storage(format!("failed to read local directory: {error}"))
    })? {
        let entry = entry.map_err(|error| {
            BackendError::storage(format!("failed to read local directory entry: {error}"))
        })?;
        let file_type = entry.file_type().map_err(|error| {
            BackendError::storage(format!("failed to read local file type: {error}"))
        })?;
        if file_type.is_dir() {
            total_bytes += calculate_directory_size(&entry.path())?;
        } else if file_type.is_file() {
            total_bytes += entry
                .metadata()
                .map_err(|error| {
                    BackendError::storage(format!("failed to read local file metadata: {error}"))
                })?
                .len();
        }
    }
    Ok(total_bytes)
}

fn upload_directory_entries(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    sftp: &ssh2::Sftp,
    local_directory: &Path,
    remote_directory: &str,
    total_bytes: u64,
    transferred: &mut u64,
) -> BackendResult<()> {
    for entry in fs::read_dir(local_directory).map_err(|error| {
        BackendError::storage(format!("failed to read local directory: {error}"))
    })? {
        ensure_task_not_cancelled(state, task_id)?;
        let entry = entry.map_err(|error| {
            BackendError::storage(format!("failed to read local directory entry: {error}"))
        })?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        let remote_path = join_remote_path(remote_directory, &file_name);
        let file_type = entry.file_type().map_err(|error| {
            BackendError::storage(format!("failed to read local file type: {error}"))
        })?;
        if file_type.is_dir() {
            ensure_remote_directory(sftp, Path::new(&remote_path))?;
            upload_directory_entries(
                window,
                state,
                task_id,
                sftp,
                &entry.path(),
                &remote_path,
                total_bytes,
                transferred,
            )?;
        } else if file_type.is_file() {
            upload_directory_file(
                window,
                state,
                task_id,
                sftp,
                entry.path(),
                &remote_path,
                total_bytes,
                transferred,
            )?;
        }
    }
    Ok(())
}

fn upload_directory_file(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    sftp: &ssh2::Sftp,
    local_path: PathBuf,
    remote_path: &str,
    total_bytes: u64,
    transferred: &mut u64,
) -> BackendResult<()> {
    let mut local_file = File::open(&local_path)
        .map_err(|error| BackendError::storage(format!("failed to read local file: {error}")))?;
    let mut remote_file = sftp
        .open_mode(
            Path::new(remote_path),
            OpenFlags::CREATE | OpenFlags::TRUNCATE | OpenFlags::WRITE,
            0o644,
            OpenType::File,
        )
        .map_err(|error| {
            BackendError::validation(format!("failed to open remote file for upload: {error}"))
        })?;
    let mut buffer = [0_u8; TRANSFER_BUFFER_SIZE];

    loop {
        ensure_task_not_cancelled(state, task_id)?;
        let count = local_file.read(&mut buffer).map_err(|error| {
            BackendError::storage(format!("failed to read local file: {error}"))
        })?;
        if count == 0 {
            break;
        }
        write_remote_chunk(&mut remote_file, &buffer[..count])?;
        *transferred += count as u64;
        emit_sftp_progress(state, window, task_id, *transferred, Some(total_bytes));
    }

    Ok(())
}

fn to_entry(parent_path: &str, entry_path: &Path, stat: FileStat) -> Option<SftpEntry> {
    let name = entry_path.file_name()?.to_string_lossy().to_string();
    if name == "." || name == ".." {
        return None;
    }

    Some(SftpEntry {
        path: join_remote_path(parent_path, &name),
        name,
        is_directory: stat.is_dir(),
        size_bytes: stat.size.unwrap_or(0),
        modified: stat.mtime,
    })
}

fn join_remote_path(parent_path: &str, name: &str) -> String {
    if parent_path == "/" {
        format!("/{name}")
    } else {
        format!("{}/{}", parent_path.trim_end_matches('/'), name)
    }
}

fn validate_connection(connection: &SftpConnectionRequest) -> BackendResult<()> {
    if connection.host.trim().is_empty() {
        return Err(BackendError::validation("host is required"));
    }
    if connection.username.trim().is_empty() {
        return Err(BackendError::validation("username is required"));
    }
    if connection.port == 0 {
        return Err(BackendError::validation("port must be greater than zero"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::BackendState;

    #[test]
    fn records_and_lists_sftp_task_snapshots_by_recent_update() {
        let state = test_state();

        record_sftp_task(
            &state,
            "a-older",
            SftpTaskStatus::Running,
            10,
            Some(100),
            None,
        )
        .expect("record older task");
        record_sftp_task(
            &state,
            "z-newer",
            SftpTaskStatus::Done,
            100,
            Some(100),
            None,
        )
        .expect("record newer task");

        let tasks = list_sftp_tasks(&state).expect("list tasks");
        assert_eq!(tasks.len(), 2);
        assert_eq!(tasks[0].task_id, "z-newer");
        assert!(matches!(tasks[0].status, SftpTaskStatus::Done));
        assert_eq!(tasks[1].task_id, "a-older");
        assert!(matches!(tasks[1].status, SftpTaskStatus::Running));
    }

    #[test]
    fn task_snapshot_keeps_registered_metadata() {
        let state = test_state();
        register_sftp_task(&state, "task", "download", "Download file", "/srv/app.log")
            .expect("register task");

        record_sftp_task(&state, "task", SftpTaskStatus::Done, 100, Some(100), None)
            .expect("record done task");

        let task = list_sftp_tasks(&state).expect("list tasks").remove(0);
        assert_eq!(task.kind, "download");
        assert_eq!(task.title, "Download file");
        assert_eq!(task.detail, "/srv/app.log");
        assert!(matches!(task.status, SftpTaskStatus::Done));
    }

    #[test]
    fn failed_task_snapshot_records_error() {
        let state = test_state();

        record_sftp_task(
            &state,
            "failed-task",
            SftpTaskStatus::Failed,
            0,
            None,
            Some("network lost".to_string()),
        )
        .expect("record failed task");

        let task = list_sftp_tasks(&state).expect("list tasks").remove(0);
        assert_eq!(task.task_id, "failed-task");
        assert!(matches!(task.status, SftpTaskStatus::Failed));
        assert_eq!(task.error.as_deref(), Some("network lost"));
    }

    #[test]
    fn pruning_drops_expired_terminal_tasks_but_keeps_running_tasks() {
        let now_ms = 10 * COMPLETED_SFTP_TASK_RETENTION_MS;
        let old_ms = now_ms - COMPLETED_SFTP_TASK_RETENTION_MS - 1;
        let fresh_ms = now_ms - COMPLETED_SFTP_TASK_RETENTION_MS + 1;
        let tasks = prune_sftp_tasks(
            vec![
                task_snapshot("old-done", SftpTaskStatus::Done, old_ms),
                task_snapshot("old-running", SftpTaskStatus::Running, old_ms),
                task_snapshot("fresh-failed", SftpTaskStatus::Failed, fresh_ms),
            ],
            now_ms,
        );

        assert_eq!(tasks.len(), 2);
        assert!(tasks.iter().any(|task| task.task_id == "old-running"));
        assert!(tasks.iter().any(|task| task.task_id == "fresh-failed"));
        assert!(!tasks.iter().any(|task| task.task_id == "old-done"));
    }

    #[test]
    fn pruning_limits_total_task_count() {
        let tasks = prune_sftp_tasks(
            (0..150)
                .map(|index| {
                    task_snapshot(&format!("task-{index:03}"), SftpTaskStatus::Done, index)
                })
                .collect(),
            COMPLETED_SFTP_TASK_RETENTION_MS,
        );

        assert_eq!(tasks.len(), MAX_PERSISTED_SFTP_TASKS);
        assert_eq!(tasks[0].task_id, "task-149");
        assert_eq!(tasks[99].task_id, "task-050");
    }

    #[test]
    fn cancelled_task_snapshot_keeps_existing_progress() {
        let state = test_state();
        record_sftp_task(&state, "task", SftpTaskStatus::Running, 42, Some(100), None)
            .expect("record running task");

        mark_sftp_task_cancelled(&state, "task").expect("cancel task");

        let task = list_sftp_tasks(&state).expect("list tasks").remove(0);
        assert_eq!(task.task_id, "task");
        assert!(matches!(task.status, SftpTaskStatus::Cancelled));
        assert_eq!(task.transferred_bytes, 42);
        assert_eq!(task.total_bytes, Some(100));
        assert_eq!(task.error.as_deref(), Some("sftp task was cancelled"));
    }

    fn task_snapshot(
        task_id: &str,
        status: SftpTaskStatus,
        updated_at_ms: u128,
    ) -> SftpTaskSnapshot {
        SftpTaskSnapshot {
            task_id: task_id.to_string(),
            kind: "download".to_string(),
            title: "Download file".to_string(),
            detail: "/srv/app.log".to_string(),
            status,
            transferred_bytes: 0,
            total_bytes: None,
            error: None,
            updated_at_ms,
            started_at_ms: None,
        }
    }

    fn test_state() -> BackendState {
        BackendState::new(temp_dir())
    }

    fn temp_dir() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("vrshell-sftp-service-test-{unique}"))
    }
}
