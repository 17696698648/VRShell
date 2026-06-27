use crate::infrastructure::event_bus::EventSink;
use crate::{
    domain::sftp::{SftpConnectionRequest, SftpEntry},
    error::{BackendError, BackendResult},
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
    time::Instant,
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

pub(crate) use tasks::{list_sftp_tasks, mark_sftp_task_cancelled, register_sftp_task};
pub(crate) use transfer::emit_sftp_failed;

pub(crate) struct SftpSessionRuntime {
    session: Mutex<ssh2::Session>,
}

impl SftpSessionRuntime {
    fn new(session: ssh2::Session) -> Self {
        Self {
            session: Mutex::new(session),
        }
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
        result
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
            sftp.rmdir(Path::new(&remote_path)).map_err(|error| {
                BackendError::sftp(format!("failed to delete remote directory: {error}"))
            })
        } else {
            sftp.unlink(Path::new(&remote_path)).map_err(|error| {
                BackendError::sftp(format!("failed to delete remote file: {error}"))
            })
        }
    })
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

    with_sftp(state, &connection, |sftp| {
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
        write_upload_source_with_progress(window, state, task_id, &mut file, upload_source)
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
    tracing::info!(task_id = ?task_id, remote_path = %remote_path, "starting SFTP download");
    let remote_path = validate_remote_path(&connection, remote_path)?;
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
