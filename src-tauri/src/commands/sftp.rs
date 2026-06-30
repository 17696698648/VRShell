use crate::{
    domain::sftp::SftpTaskSnapshot,
    ipc::{
        dto::{SftpConnectionDto, SftpDeleteRequest, SftpRenameRequest, SftpTransferRequest},
        IpcResult,
    },
    services::sftp_service,
    state::BackendState,
};
use tauri::{Manager, State};

#[tauri::command]
pub fn sftp_list(
    state: State<'_, BackendState>,
    connection: SftpConnectionDto,
    path: String,
) -> IpcResult<Vec<crate::domain::sftp::SftpEntry>> {
    sftp_service::list(Some(&state), connection.into(), path).map_err(Into::into)
}

#[tauri::command]
pub fn sftp_mkdir(
    state: State<'_, BackendState>,
    connection: SftpConnectionDto,
    remote_path: String,
) -> IpcResult<()> {
    sftp_service::mkdir(Some(&state), connection.into(), remote_path).map_err(Into::into)
}

#[tauri::command]
pub fn sftp_create_file(
    state: State<'_, BackendState>,
    connection: SftpConnectionDto,
    remote_path: String,
) -> IpcResult<()> {
    sftp_service::create_file(Some(&state), connection.into(), remote_path).map_err(Into::into)
}

#[tauri::command]
pub fn sftp_rename(
    state: State<'_, BackendState>,
    connection: SftpConnectionDto,
    old_path: String,
    new_path: String,
) -> IpcResult<()> {
    let request = SftpRenameRequest {
        connection,
        old_path,
        new_path,
    };
    sftp_service::rename(
        Some(&state),
        request.connection.into(),
        request.old_path,
        request.new_path,
    )
    .map_err(Into::into)
}

#[tauri::command]
pub async fn sftp_delete(
    window: tauri::WebviewWindow,
    connection: SftpConnectionDto,
    remote_path: String,
    is_directory: Option<bool>,
) -> IpcResult<()> {
    let request = SftpDeleteRequest {
        connection,
        remote_path,
        is_directory,
    };
    tauri::async_runtime::spawn_blocking(move || {
        let state = window.state::<BackendState>();
        sftp_service::delete(
            Some(&state),
            request.connection.into(),
            request.remote_path,
            request.is_directory,
        )
    })
    .await
    .map_err(|error| crate::ipc::IpcError {
        code: "sftpError".to_string(),
        message: format!("failed to join SFTP delete task: {error}"),
        recoverable: true,
    })?
    .map_err(Into::into)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn sftp_upload(
    window: tauri::WebviewWindow,
    state: State<'_, BackendState>,
    connection: SftpConnectionDto,
    remote_path: String,
    data_base64: Option<String>,
    task_id: String,
    local_path: Option<String>,
    options: Option<crate::ipc::dto::SftpTransferOptionsDto>,
) -> IpcResult<()> {
    let request = SftpTransferRequest {
        connection,
        remote_path,
        task_id,
        data_base64,
        local_path,
        options,
    };
    clear_cancelled_sftp_task(&state, &request.task_id)?;
    sftp_service::register_sftp_task(
        &state,
        &request.task_id,
        "upload",
        "Upload file",
        &request.remote_path,
    )
    .map_err(crate::ipc::IpcError::from)?;
    std::thread::spawn(move || {
        let state = window.state::<BackendState>();
        let task_id = request.task_id.clone();
        if let Err(error) =
            sftp_service::upload_file_with_progress(Some(&window), Some(&state), request)
        {
            sftp_service::emit_sftp_failed(Some(&state), &window, &task_id, error.message);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn sftp_upload_directory(
    window: tauri::WebviewWindow,
    state: State<'_, BackendState>,
    connection: SftpConnectionDto,
    local_path: String,
    remote_path: String,
    task_id: String,
) -> IpcResult<()> {
    clear_cancelled_sftp_task(&state, &task_id)?;
    sftp_service::register_sftp_task(&state, &task_id, "upload", "Upload folder", &remote_path)
        .map_err(crate::ipc::IpcError::from)?;
    std::thread::spawn(move || {
        let state = window.state::<BackendState>();
        if let Err(error) = sftp_service::upload_directory_with_progress(
            Some(&window),
            Some(&state),
            Some(&task_id),
            connection.into(),
            local_path,
            remote_path,
        ) {
            sftp_service::emit_sftp_failed(Some(&state), &window, &task_id, error.message);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn sftp_download(
    window: tauri::WebviewWindow,
    state: State<'_, BackendState>,
    connection: SftpConnectionDto,
    remote_path: String,
    task_id: String,
    local_path: Option<String>,
) -> IpcResult<()> {
    let request = SftpTransferRequest {
        connection,
        remote_path,
        task_id,
        data_base64: None,
        local_path,
        options: None,
    };
    clear_cancelled_sftp_task(&state, &request.task_id)?;
    sftp_service::register_sftp_task(
        &state,
        &request.task_id,
        "download",
        "Download file",
        &request.remote_path,
    )
    .map_err(crate::ipc::IpcError::from)?;
    std::thread::spawn(move || {
        let state = window.state::<BackendState>();
        if let Err(error) = sftp_service::download_file_with_progress(
            Some(&window),
            Some(&state),
            Some(&request.task_id),
            request.connection.into(),
            request.remote_path,
            request.local_path,
        ) {
            sftp_service::emit_sftp_failed(Some(&state), &window, &request.task_id, error.message);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn sftp_read_file(
    state: State<'_, BackendState>,
    connection: SftpConnectionDto,
    remote_path: String,
) -> IpcResult<String> {
    sftp_service::read_file(Some(&state), connection.into(), remote_path).map_err(Into::into)
}

#[tauri::command]
pub fn list_sftp_tasks(state: State<'_, BackendState>) -> IpcResult<Vec<SftpTaskSnapshot>> {
    sftp_service::list_sftp_tasks(&state).map_err(Into::into)
}

#[tauri::command]
pub fn cancel_sftp_task(state: State<'_, BackendState>, task_id: String) -> IpcResult<()> {
    state.cancelled_sftp_tasks.lock().insert(task_id.clone());
    sftp_service::mark_sftp_task_cancelled(&state, &task_id).map_err(Into::into)
}

fn clear_cancelled_sftp_task(state: &BackendState, task_id: &str) -> IpcResult<()> {
    state.cancelled_sftp_tasks.lock().remove(task_id);
    Ok(())
}
