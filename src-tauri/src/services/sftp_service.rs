use crate::infrastructure::event_bus::EventSink;
use crate::{
    domain::sftp::{SftpConnectionKey, SftpConnectionRequest, SftpEntry},
    error::{BackendError, BackendResult},
    ipc::dto::{SftpTransferConflictStrategyDto, SftpTransferOptionsDto, SftpTransferRequest},
    state::BackendState,
};
use base64::Engine;
use parking_lot::Mutex;
use ssh2::{FileStat, OpenFlags, OpenType};
use std::{
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, Instant},
};

#[path = "sftp_service/connection.rs"]
mod connection;
#[path = "sftp_service/tasks.rs"]
mod tasks;
#[path = "sftp_service/transfer.rs"]
mod transfer;

use connection::{open_sftp, open_ssh_session, validate_connection, validate_remote_path};
use transfer::{
    emit_sftp_completed, emit_sftp_progress, ensure_task_not_cancelled, read_to_end_with_progress,
    write_download_to_local_file_with_progress, write_remote_chunk,
    write_upload_source_with_progress, UploadSource,
};

const TRANSFER_BUFFER_SIZE: usize = 64 * 1024;
const SFTP_SESSION_IDLE_TTL: Duration = Duration::from_secs(10 * 60);
const MAX_ACTIVE_SFTP_TRANSFERS: usize = 4;
const MAX_ACTIVE_SFTP_TRANSFERS_PER_CONNECTION: usize = 2;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum SftpTransferConflictStrategy {
    Overwrite,
    Skip,
    Rename,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct SftpTransferOptions {
    conflict: SftpTransferConflictStrategy,
}

impl Default for SftpTransferOptions {
    fn default() -> Self {
        Self {
            conflict: SftpTransferConflictStrategy::Overwrite,
        }
    }
}

impl From<Option<SftpTransferOptionsDto>> for SftpTransferOptions {
    fn from(options: Option<SftpTransferOptionsDto>) -> Self {
        let Some(options) = options else {
            return Self::default();
        };
        let conflict = match options.conflict {
            Some(SftpTransferConflictStrategyDto::Overwrite) => {
                SftpTransferConflictStrategy::Overwrite
            }
            Some(SftpTransferConflictStrategyDto::Skip) => SftpTransferConflictStrategy::Skip,
            Some(SftpTransferConflictStrategyDto::Rename) => SftpTransferConflictStrategy::Rename,
            None if options.overwrite == Some(false) => SftpTransferConflictStrategy::Skip,
            None => SftpTransferConflictStrategy::Overwrite,
        };
        Self { conflict }
    }
}

pub(crate) use tasks::{list_sftp_tasks, mark_sftp_task_cancelled, register_sftp_task};
pub(crate) use transfer::emit_sftp_failed;

pub(crate) struct SftpSessionRuntime {
    session: Mutex<ssh2::Session>,
    last_used: Mutex<Instant>,
}

impl SftpSessionRuntime {
    fn new(session: ssh2::Session) -> Self {
        Self {
            session: Mutex::new(session),
            last_used: Mutex::new(Instant::now()),
        }
    }

    fn is_idle_expired(&self, now: Instant, idle_ttl: Duration) -> bool {
        is_sftp_session_idle_expired(*self.last_used.lock(), now, idle_ttl)
    }

    fn with_sftp<T>(
        &self,
        connection: &SftpConnectionRequest,
        operation: impl FnOnce(&ssh2::Sftp) -> BackendResult<T>,
    ) -> BackendResult<T> {
        let started = Instant::now();
        let session = self.session.lock();
        let sftp = open_sftp(&session)?;
        let result = operation(&sftp);
        tracing::trace!(
            host = %connection.host,
            port = connection.port,
            elapsed_ms = started.elapsed().as_millis() as u64,
            success = result.is_ok(),
            "SFTP session operation handled"
        );
        *self.last_used.lock() = Instant::now();
        result
    }
}

pub(crate) fn prune_idle_sftp_sessions(state: &BackendState) -> usize {
    prune_idle_sftp_sessions_with_ttl(state, SFTP_SESSION_IDLE_TTL)
}

pub(crate) fn drop_cached_sftp_sessions_for_terminal(
    state: &BackendState,
    host: &str,
    username: &str,
) -> usize {
    let mut sessions = state.sftp_sessions.lock();
    let before = sessions.len();
    sessions.retain(|key, _| key.host != host || key.username != username);
    before - sessions.len()
}

fn prune_idle_sftp_sessions_with_ttl(state: &BackendState, idle_ttl: Duration) -> usize {
    let now = Instant::now();
    let mut sessions = state.sftp_sessions.lock();
    let before = sessions.len();
    sessions.retain(|_, runtime| !runtime.is_idle_expired(now, idle_ttl));
    before - sessions.len()
}

fn is_sftp_session_idle_expired(last_used: Instant, now: Instant, idle_ttl: Duration) -> bool {
    now.duration_since(last_used) > idle_ttl
}

struct SftpTransferPermit<'a> {
    state: &'a BackendState,
    key: SftpConnectionKey,
}

impl<'a> SftpTransferPermit<'a> {
    fn acquire(
        state: Option<&'a BackendState>,
        connection: &SftpConnectionRequest,
    ) -> BackendResult<Option<Self>> {
        let Some(state) = state else {
            return Ok(None);
        };
        let key = connection.cache_key();
        let mut counters = state.active_sftp_transfers.lock();
        let connection_count = counters.by_connection.get(&key).copied().unwrap_or(0);

        if counters.total >= MAX_ACTIVE_SFTP_TRANSFERS {
            return Err(BackendError::sftp(format!(
                "too many active SFTP transfers; maximum is {MAX_ACTIVE_SFTP_TRANSFERS}"
            )));
        }
        if connection_count >= MAX_ACTIVE_SFTP_TRANSFERS_PER_CONNECTION {
            return Err(BackendError::sftp(format!(
                "too many active SFTP transfers for this connection; maximum is {MAX_ACTIVE_SFTP_TRANSFERS_PER_CONNECTION}"
            )));
        }

        counters.total += 1;
        counters
            .by_connection
            .insert(key.clone(), connection_count + 1);
        Ok(Some(Self { state, key }))
    }
}

impl Drop for SftpTransferPermit<'_> {
    fn drop(&mut self) {
        let mut counters = self.state.active_sftp_transfers.lock();
        counters.total = counters.total.saturating_sub(1);
        if let Some(connection_count) = counters.by_connection.get_mut(&self.key) {
            *connection_count = connection_count.saturating_sub(1);
            if *connection_count == 0 {
                counters.by_connection.remove(&self.key);
            }
        }
    }
}

fn with_sftp<T>(
    state: Option<&BackendState>,
    connection: &SftpConnectionRequest,
    operation: impl FnOnce(&ssh2::Sftp) -> BackendResult<T>,
) -> BackendResult<T> {
    let Some(state) = state else {
        let session = open_ssh_session(connection)?;
        let sftp = open_sftp(&session)?;
        return operation(&sftp);
    };

    let pruned = prune_idle_sftp_sessions(state);
    if pruned > 0 {
        tracing::debug!(count = pruned, "pruned idle cached SFTP sessions");
    }

    let key = connection.cache_key();
    if let Some(runtime) = state.sftp_sessions.lock().get(&key).cloned() {
        match runtime.with_sftp(connection, operation) {
            Ok(value) => return Ok(value),
            Err(error) => {
                state.sftp_sessions.lock().remove(&key);
                tracing::debug!(host = %connection.host, port = connection.port, "dropping cached SFTP session after operation error");
                return Err(error);
            }
        }
    }

    let session = open_ssh_session(connection)?;
    let runtime = Arc::new(SftpSessionRuntime::new(session));
    let result = runtime.with_sftp(connection, operation);
    if result.is_ok() {
        state.sftp_sessions.lock().insert(key, runtime);
    }
    result
}

pub(crate) fn list(
    state: Option<&BackendState>,
    connection: SftpConnectionRequest,
    path: String,
) -> BackendResult<Vec<SftpEntry>> {
    validate_connection(&connection)?;
    let path = path.trim();
    if path.is_empty() {
        return Err(BackendError::validation("path is required"));
    }

    with_sftp(state, &connection, |sftp| {
        let mut entries = sftp
            .readdir(Path::new(path))
            .map_err(|error| BackendError::sftp(format!("failed to list sftp path: {error}")))?
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
    })
}

pub(crate) fn read_file(
    state: Option<&BackendState>,
    connection: SftpConnectionRequest,
    remote_path: String,
) -> BackendResult<String> {
    validate_connection(&connection)?;
    let remote_path = remote_path.trim();
    if remote_path.is_empty() {
        return Err(BackendError::validation("remote path is required"));
    }

    with_sftp(state, &connection, |sftp| {
        let mut file = sftp
            .open(Path::new(remote_path))
            .map_err(|error| BackendError::sftp(format!("failed to open remote file: {error}")))?;
        let mut content = Vec::new();
        file.read_to_end(&mut content)
            .map_err(|error| BackendError::sftp(format!("failed to read remote file: {error}")))?;
        Ok(base64::engine::general_purpose::STANDARD.encode(content))
    })
}

pub(crate) fn mkdir(
    state: Option<&BackendState>,
    connection: SftpConnectionRequest,
    remote_path: String,
) -> BackendResult<()> {
    let remote_path = validate_remote_path(&connection, remote_path)?;
    with_sftp(state, &connection, |sftp| {
        sftp.mkdir(Path::new(&remote_path), 0o755).map_err(|error| {
            BackendError::sftp(format!("failed to create remote directory: {error}"))
        })
    })
}

pub(crate) fn create_file(
    state: Option<&BackendState>,
    connection: SftpConnectionRequest,
    remote_path: String,
) -> BackendResult<()> {
    let remote_path = validate_remote_path(&connection, remote_path)?;
    with_sftp(state, &connection, |sftp| {
        let _file = sftp
            .open_mode(
                Path::new(&remote_path),
                OpenFlags::CREATE | OpenFlags::EXCLUSIVE | OpenFlags::WRITE,
                0o644,
                OpenType::File,
            )
            .map_err(|error| {
                BackendError::sftp(format!("failed to create remote file: {error}"))
            })?;
        Ok(())
    })
}

pub(crate) fn rename(
    state: Option<&BackendState>,
    connection: SftpConnectionRequest,
    old_path: String,
    new_path: String,
) -> BackendResult<()> {
    let old_path = validate_remote_path(&connection, old_path)?;
    let new_path = validate_remote_path(&connection, new_path)?;
    with_sftp(state, &connection, |sftp| {
        sftp.rename(Path::new(&old_path), Path::new(&new_path), None)
            .map_err(|error| BackendError::sftp(format!("failed to rename remote path: {error}")))
    })
}

pub(crate) fn delete(
    state: Option<&BackendState>,
    connection: SftpConnectionRequest,
    remote_path: String,
    is_directory: Option<bool>,
) -> BackendResult<()> {
    let remote_path = validate_remote_path(&connection, remote_path)?;
    with_sftp(state, &connection, |sftp| {
        let is_directory = match is_directory {
            Some(value) => value,
            None => sftp
                .stat(Path::new(&remote_path))
                .map_err(|error| {
                    BackendError::sftp(format!("failed to stat remote path: {error}"))
                })?
                .is_dir(),
        };

        if is_directory {
            delete_remote_directory_recursive(sftp, Path::new(&remote_path))
        } else {
            delete_remote_file(sftp, Path::new(&remote_path))
        }
    })
}

fn delete_remote_directory_recursive(sftp: &ssh2::Sftp, remote_path: &Path) -> BackendResult<()> {
    let entries = sftp.readdir(remote_path).map_err(|error| {
        BackendError::sftp(format!(
            "failed to list remote directory before deletion: {error}"
        ))
    })?;

    for (entry_path, stat) in entries {
        let Some(name) = entry_path.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        if is_special_directory_entry(name) {
            continue;
        }

        if stat.is_dir() {
            delete_remote_directory_recursive(sftp, &entry_path)?;
        } else {
            delete_remote_file(sftp, &entry_path)?;
        }
    }

    sftp.rmdir(remote_path)
        .map_err(|error| BackendError::sftp(format!("failed to delete remote directory: {error}")))
}

fn delete_remote_file(sftp: &ssh2::Sftp, remote_path: &Path) -> BackendResult<()> {
    sftp.unlink(remote_path)
        .map_err(|error| BackendError::sftp(format!("failed to delete remote file: {error}")))
}

fn is_special_directory_entry(name: &str) -> bool {
    name == "." || name == ".."
}

pub(crate) fn upload_file_with_progress(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    request: SftpTransferRequest,
) -> BackendResult<()> {
    tracing::info!(task_id = %request.task_id, trace_id = %sftp_task_trace_id(&request.task_id), remote_path = %request.remote_path, "starting SFTP upload");
    let task_id = request.task_id;
    let connection: SftpConnectionRequest = request.connection.into();
    let remote_path = validate_remote_path(&connection, request.remote_path)?;
    let options = SftpTransferOptions::from(request.options);
    let upload_source = match (request.data_base64, request.local_path) {
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

    let _permit = SftpTransferPermit::acquire(state, &connection)?;
    with_sftp(state, &connection, |sftp| {
        let remote_path = resolve_upload_path_for_conflict(sftp, &remote_path, options)?;
        if remote_path.is_none() {
            emit_sftp_completed(state, window, Some(&task_id), 0, Some(0));
            return Ok(());
        }
        let remote_path = remote_path.expect("checked remote path");
        let mut file = sftp
            .open_mode(
                Path::new(&remote_path),
                OpenFlags::CREATE | OpenFlags::TRUNCATE | OpenFlags::WRITE,
                0o644,
                OpenType::File,
            )
            .map_err(|error| {
                BackendError::sftp(format!("failed to open remote file for upload: {error}"))
            })?;
        write_upload_source_with_progress(window, state, Some(&task_id), &mut file, upload_source)
    })
}

pub(crate) fn download_file_with_progress(
    window: Option<&impl EventSink>,
    state: Option<&BackendState>,
    task_id: Option<&str>,
    connection: SftpConnectionRequest,
    remote_path: String,
    local_path: Option<String>,
) -> BackendResult<String> {
    tracing::info!(task_id = ?task_id, trace_id = ?task_id.map(sftp_task_trace_id), remote_path = %remote_path, "starting SFTP download");
    let remote_path = validate_remote_path(&connection, remote_path)?;
    let _permit = SftpTransferPermit::acquire(state, &connection)?;
    with_sftp(state, &connection, |sftp| {
        let total_bytes = sftp
            .stat(Path::new(&remote_path))
            .ok()
            .and_then(|stat| stat.size);
        let mut remote_file = sftp
            .open(Path::new(&remote_path))
            .map_err(|error| BackendError::sftp(format!("failed to open remote file: {error}")))?;
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
    })
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

    let _permit = SftpTransferPermit::acquire(state, &connection)?;
    with_sftp(state, &connection, |sftp| {
        ensure_remote_directory(sftp, Path::new(&remote_path))?;
        let mut transferred = 0_u64;
        emit_sftp_progress(state, window, task_id, transferred, Some(total_bytes));
        upload_directory_entries(
            window,
            state,
            task_id,
            sftp,
            &local_path,
            &remote_path,
            total_bytes,
            &mut transferred,
        )?;
        emit_sftp_completed(state, window, task_id, transferred, Some(total_bytes));
        Ok(())
    })
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
    sftp.mkdir(remote_path, 0o755)
        .map_err(|error| BackendError::sftp(format!("failed to create remote directory: {error}")))
}

fn resolve_upload_path_for_conflict(
    sftp: &ssh2::Sftp,
    remote_path: &str,
    options: SftpTransferOptions,
) -> BackendResult<Option<String>> {
    if sftp.stat(Path::new(remote_path)).is_err() {
        return Ok(Some(remote_path.to_string()));
    }

    match options.conflict {
        SftpTransferConflictStrategy::Overwrite => Ok(Some(remote_path.to_string())),
        SftpTransferConflictStrategy::Skip => Ok(None),
        SftpTransferConflictStrategy::Rename => {
            next_available_remote_path(sftp, remote_path).map(Some)
        }
    }
}

fn next_available_remote_path(sftp: &ssh2::Sftp, remote_path: &str) -> BackendResult<String> {
    for index in 1..=999 {
        let candidate = renamed_remote_path(remote_path, index);
        if sftp.stat(Path::new(&candidate)).is_err() {
            return Ok(candidate);
        }
    }
    Err(BackendError::sftp(
        "failed to find available remote filename for rename conflict strategy",
    ))
}

fn renamed_remote_path(remote_path: &str, index: usize) -> String {
    let path = Path::new(remote_path);
    let parent = path.parent().and_then(Path::to_str).unwrap_or("");
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(remote_path);
    let (stem, extension) = split_file_name(file_name);
    let renamed = match extension {
        Some(extension) => format!("{stem} ({index}).{extension}"),
        None => format!("{stem} ({index})"),
    };

    if parent.is_empty() || parent == "/" {
        format!("/{renamed}")
    } else {
        format!("{}/{}", parent.trim_end_matches('/'), renamed)
    }
}

fn split_file_name(file_name: &str) -> (&str, Option<&str>) {
    match file_name.rsplit_once('.') {
        Some((stem, extension)) if !stem.is_empty() && !extension.is_empty() => {
            (stem, Some(extension))
        }
        _ => (file_name, None),
    }
}

fn sftp_task_trace_id(task_id: &str) -> String {
    format!("task:{task_id}")
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

#[allow(clippy::too_many_arguments)]
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

#[allow(clippy::too_many_arguments)]
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
            BackendError::sftp(format!("failed to open remote file for upload: {error}"))
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

#[cfg(test)]
mod tests {
    use super::{
        is_sftp_session_idle_expired, is_special_directory_entry, renamed_remote_path,
        SftpTransferConflictStrategy, SftpTransferOptions, SftpTransferPermit,
        MAX_ACTIVE_SFTP_TRANSFERS, MAX_ACTIVE_SFTP_TRANSFERS_PER_CONNECTION, SFTP_SESSION_IDLE_TTL,
    };
    use crate::ipc::dto::{SftpTransferConflictStrategyDto, SftpTransferOptionsDto};
    use crate::{domain::sftp::SftpConnectionRequest, state::BackendState};
    use std::{
        fs,
        time::{Duration, Instant, SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn recursive_delete_skips_special_directory_entries() {
        assert!(is_special_directory_entry("."));
        assert!(is_special_directory_entry(".."));
        assert!(!is_special_directory_entry("nested"));
    }

    #[test]
    fn sftp_session_idle_ttl_is_ten_minutes() {
        assert_eq!(SFTP_SESSION_IDLE_TTL, Duration::from_secs(600));
    }

    #[test]
    fn sftp_session_idle_expiration_uses_last_used_time() {
        let now = Instant::now();
        let fresh = now - Duration::from_secs(60);
        let expired = now - SFTP_SESSION_IDLE_TTL - Duration::from_secs(1);

        assert!(!is_sftp_session_idle_expired(
            fresh,
            now,
            SFTP_SESSION_IDLE_TTL
        ));
        assert!(is_sftp_session_idle_expired(
            expired,
            now,
            SFTP_SESSION_IDLE_TTL
        ));
    }

    #[test]
    fn sftp_transfer_permit_limits_transfers_per_connection() {
        let dir = temp_dir();
        let state = BackendState::new(dir.clone());
        let connection = test_connection("host-a");
        let first = SftpTransferPermit::acquire(Some(&state), &connection).expect("first permit");
        let second = SftpTransferPermit::acquire(Some(&state), &connection).expect("second permit");

        let error = match SftpTransferPermit::acquire(Some(&state), &connection) {
            Ok(_) => panic!("third same-connection permit should fail"),
            Err(error) => error,
        };

        assert_eq!(error.code, "sftpError");
        assert!(error.message.contains(&format!(
            "maximum is {MAX_ACTIVE_SFTP_TRANSFERS_PER_CONNECTION}"
        )));

        drop(first);
        let third = SftpTransferPermit::acquire(Some(&state), &connection)
            .expect("permit should be released after drop");
        drop(second);
        drop(third);
        assert_eq!(state.active_sftp_transfers.lock().total, 0);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn sftp_transfer_permit_limits_global_transfers() {
        let dir = temp_dir();
        let state = BackendState::new(dir.clone());
        let connections = (0..MAX_ACTIVE_SFTP_TRANSFERS)
            .map(|index| test_connection(&format!("host-{index}")))
            .collect::<Vec<_>>();
        let permits = connections
            .iter()
            .map(|connection| SftpTransferPermit::acquire(Some(&state), connection))
            .collect::<Result<Vec<_>, _>>()
            .expect("global permits");

        let error = match SftpTransferPermit::acquire(Some(&state), &test_connection("overflow")) {
            Ok(_) => panic!("overflow permit should fail"),
            Err(error) => error,
        };

        assert_eq!(error.code, "sftpError");
        assert!(error
            .message
            .contains(&format!("maximum is {MAX_ACTIVE_SFTP_TRANSFERS}")));
        drop(permits);
        assert_eq!(state.active_sftp_transfers.lock().total, 0);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn transfer_options_preserve_legacy_overwrite_false_as_skip() {
        let options = SftpTransferOptions::from(Some(SftpTransferOptionsDto {
            conflict: None,
            overwrite: Some(false),
            resume: None,
        }));

        assert_eq!(options.conflict, SftpTransferConflictStrategy::Skip);
    }

    #[test]
    fn transfer_options_prefer_explicit_conflict_strategy() {
        let options = SftpTransferOptions::from(Some(SftpTransferOptionsDto {
            conflict: Some(SftpTransferConflictStrategyDto::Rename),
            overwrite: Some(false),
            resume: None,
        }));

        assert_eq!(options.conflict, SftpTransferConflictStrategy::Rename);
    }

    #[test]
    fn renamed_remote_path_keeps_directory_and_extension() {
        assert_eq!(renamed_remote_path("/srv/app.log", 2), "/srv/app (2).log");
        assert_eq!(renamed_remote_path("/srv/archive", 1), "/srv/archive (1)");
    }

    fn test_connection(host: &str) -> SftpConnectionRequest {
        SftpConnectionRequest {
            host: host.to_string(),
            port: 22,
            username: "user".to_string(),
            password: None,
            private_key_path: None,
            passphrase: None,
            auth_method: Some("agent".to_string()),
            credential_ref: None,
        }
    }

    fn temp_dir() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("vrshell-sftp-service-test-{unique}"))
    }
}
