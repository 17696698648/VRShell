use crate::{config, sessions::AppState};
use serde::Serialize;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{Emitter, State};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpUploadFailure {
    pub(crate) remote_path: String,
    pub(crate) error: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpUploadSummary {
    pub(crate) uploaded: usize,
    pub(crate) failed: Vec<SftpUploadFailure>,
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
    bytes_per_second: Option<u64>,
    eta_seconds: Option<u64>,
}

pub(crate) fn register_sftp_task(
    state: &State<'_, AppState>,
    task_id: &str,
) -> Result<Arc<AtomicBool>, String> {
    let cancel_flag = Arc::new(AtomicBool::new(false));
    let mut tasks = state
        .sftp_tasks
        .lock()
        .map_err(|e| format!("sftp task registry lock err: {}", e))?;
    if !tasks.contains_key(task_id) && tasks.len() >= config::SFTP_MAX_ACTIVE_TASKS {
        return Err(format!(
            "too many active SFTP tasks (limit: {})",
            config::SFTP_MAX_ACTIVE_TASKS
        ));
    }
    tasks.insert(task_id.to_string(), cancel_flag.clone());
    Ok(cancel_flag)
}

pub(crate) fn finish_sftp_task(state: &State<'_, AppState>, task_id: &str) {
    if let Ok(mut tasks) = state.sftp_tasks.lock() {
        tasks.remove(task_id);
    }
}

pub(crate) fn check_sftp_task_cancelled(cancel_flag: &AtomicBool) -> Result<(), String> {
    if cancel_flag.load(Ordering::Relaxed) {
        Err("SFTP task canceled".into())
    } else {
        Ok(())
    }
}

pub(crate) fn get_sftp_task_queue(
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

#[allow(clippy::too_many_arguments)]
pub(crate) fn emit_sftp_progress(
    app: &tauri::AppHandle,
    task_id: &str,
    session_key: &str,
    operation: &str,
    file: &str,
    transferred: u64,
    total: u64,
    deleted: u64,
) {
    emit_sftp_progress_with_rate(
        app,
        task_id,
        session_key,
        operation,
        file,
        transferred,
        total,
        deleted,
        None,
    );
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn emit_sftp_progress_with_rate(
    app: &tauri::AppHandle,
    task_id: &str,
    session_key: &str,
    operation: &str,
    file: &str,
    transferred: u64,
    total: u64,
    deleted: u64,
    bytes_per_second: Option<u64>,
) {
    let eta_seconds = bytes_per_second.and_then(|rate| {
        if rate == 0 || total <= transferred {
            None
        } else {
            Some((total - transferred).div_ceil(rate))
        }
    });
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
            bytes_per_second,
            eta_seconds,
        },
    );
}
