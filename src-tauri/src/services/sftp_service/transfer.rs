use crate::{
    domain::sftp::SftpTaskSnapshot,
    error::{BackendError, BackendResult},
    infrastructure::event_bus::EventSink,
    state::BackendState,
};
use serde::Serialize;
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::PathBuf,
};

use super::tasks::{
    apply_sftp_task_transition, current_time_ms, find_sftp_task, SftpTaskTransition,
};
use super::TRANSFER_BUFFER_SIZE;

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

pub(super) enum UploadSource {
    Memory(Vec<u8>),
    LocalFile(PathBuf),
}

pub(super) fn write_upload_source_with_progress<W: Write>(
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

pub(super) fn write_remote_chunk<W: Write>(writer: &mut W, chunk: &[u8]) -> BackendResult<()> {
    writer
        .write_all(chunk)
        .map_err(|error| BackendError::sftp(format!("failed to write remote file: {error}")))
}

pub(super) fn read_to_end_with_progress<R: Read>(
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
        let count = reader
            .read(&mut buffer)
            .map_err(|error| BackendError::sftp(format!("failed to read remote file: {error}")))?;
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

pub(super) fn write_download_to_local_file_with_progress<R: Read>(
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
        let count = reader
            .read(&mut buffer)
            .map_err(|error| BackendError::sftp(format!("failed to read remote file: {error}")))?;
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

pub(super) fn ensure_task_not_cancelled(
    state: Option<&BackendState>,
    task_id: Option<&str>,
) -> BackendResult<()> {
    let (Some(state), Some(task_id)) = (state, task_id) else {
        return Ok(());
    };
    let cancelled = state.cancelled_sftp_tasks.lock().contains(task_id);
    if cancelled {
        Err(BackendError::cancelled("sftp task was cancelled"))
    } else {
        Ok(())
    }
}

pub(super) fn emit_sftp_progress(
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
        let _ = apply_sftp_task_transition(
            state,
            task_id,
            SftpTaskTransition::Progress {
                transferred_bytes,
                total_bytes,
            },
        );
        state.cancelled_sftp_tasks.lock().remove(task_id);
        find_sftp_task(state, task_id).ok().flatten()
    } else {
        None
    };
    let Some(window) = window else {
        return;
    };
    window.emit_event(
        crate::ipc::events::SFTP_PROGRESS,
        sftp_progress_payload(task_id, snapshot.as_ref(), transferred_bytes, total_bytes),
    );
}

pub(super) fn emit_sftp_completed(
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
        let _ = apply_sftp_task_transition(
            state,
            task_id,
            SftpTaskTransition::Complete {
                transferred_bytes,
                total_bytes,
            },
        );
        find_sftp_task(state, task_id).ok().flatten()
    } else {
        None
    };
    let Some(window) = window else {
        return;
    };
    window.emit_event(
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
        let _ = apply_sftp_task_transition(
            state,
            task_id,
            SftpTaskTransition::Fail {
                error: error.clone(),
            },
        );
        state.cancelled_sftp_tasks.lock().remove(task_id);
        find_sftp_task(state, task_id).ok().flatten()
    } else {
        None
    };
    window.emit_event(
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
