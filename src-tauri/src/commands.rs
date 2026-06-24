use crate::{
    domain::{
        credential::CredentialRef, session::SessionGroup, session_tree::SessionTreeActionPayload,
        sftp::SftpTaskSnapshot, ssh_config::SshConfigHost, terminal::TerminalOutputEvent,
    },
    error::BackendError,
    ipc::{
        dto::{
            ConnectSshRequest, SessionTreeActionResult, SftpConnectionDto, SftpDeleteRequest,
            SftpRenameRequest, SftpTransferRequest,
        },
        IpcResult,
    },
    services::{credential_service, session_service, sftp_service, terminal_service},
    state::BackendState,
};
use tauri::{Manager, State};

pub(crate) fn handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        open_devtools,
        load_session_tree,
        save_session_tree,
        session_tree_action,
        apply_session_tree_action,
        parse_ssh_config,
        connect_ssh,
        send_input,
        disconnect_session,
        resize_pty,
        poll_events,
        test_ssh_connection,
        tcp_latency,
        sftp_list,
        sftp_mkdir,
        sftp_create_file,
        sftp_rename,
        sftp_delete,
        sftp_upload,
        sftp_upload_directory,
        sftp_download,
        sftp_read_file,
        list_sftp_tasks,
        cancel_sftp_task,
        keyring_store,
        keyring_get,
        keyring_delete,
    ]
}

#[tauri::command]
fn open_devtools(window: tauri::WebviewWindow) {
    window.open_devtools();
}

#[tauri::command]
fn load_session_tree(state: State<'_, BackendState>) -> IpcResult<Vec<SessionGroup>> {
    session_service::load_session_tree(&state).map_err(Into::into)
}

#[tauri::command]
fn save_session_tree(
    state: State<'_, BackendState>,
    session_tree: Vec<SessionGroup>,
) -> IpcResult<()> {
    session_service::save_session_tree(&state, session_tree).map_err(Into::into)
}

#[tauri::command]
fn session_tree_action(
    state: State<'_, BackendState>,
    action: String,
    target_type: String,
    target_id: String,
) -> IpcResult<SessionTreeActionResult> {
    let message = session_service::session_tree_action(
        &state,
        action.clone(),
        target_type.clone(),
        target_id.clone(),
    )
    .map_err(crate::ipc::IpcError::from)?;

    Ok(SessionTreeActionResult {
        action,
        target_type,
        target_id,
        message,
    })
}

#[tauri::command]
fn apply_session_tree_action(
    state: State<'_, BackendState>,
    payload: SessionTreeActionPayload,
) -> IpcResult<SessionTreeActionResult> {
    let action = payload.action.clone();
    let target_type = payload.target_type.clone();
    let target_id = payload.target_id.clone();
    let message = session_service::apply_session_tree_action_payload(&state, payload)
        .map_err(crate::ipc::IpcError::from)?;

    Ok(SessionTreeActionResult {
        action,
        target_type,
        target_id,
        message,
    })
}

#[tauri::command]
fn parse_ssh_config() -> IpcResult<Vec<SshConfigHost>> {
    session_service::import_ssh_config().map_err(Into::into)
}

#[tauri::command]
fn connect_ssh(
    window: tauri::WebviewWindow,
    state: State<'_, BackendState>,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
    passphrase: Option<String>,
    auth_method: Option<String>,
    auto_reconnect: Option<bool>,
    idle_timeout_secs: Option<u64>,
) -> IpcResult<String> {
    let request = ConnectSshRequest {
        host,
        port,
        username,
        password,
        private_key_path,
        passphrase,
        auth_method,
        auto_reconnect,
        idle_timeout_secs,
    };
    terminal_service::connect(&state, request.into())
        .map(|session| {
            terminal_service::start_output_reader(window, session.id.clone());
            session.id
        })
        .map_err(Into::into)
}

#[tauri::command]
fn send_input(
    state: State<'_, BackendState>,
    session_id: String,
    data_base64: String,
) -> IpcResult<()> {
    terminal_service::send_input(&state, &session_id, data_base64).map_err(Into::into)
}

#[tauri::command]
fn disconnect_session(state: State<'_, BackendState>, session_id: String) -> IpcResult<()> {
    terminal_service::disconnect(&state, &session_id).map_err(Into::into)
}

#[tauri::command]
fn resize_pty(
    state: State<'_, BackendState>,
    session_id: Option<String>,
    cols: u16,
    rows: u16,
) -> IpcResult<()> {
    terminal_service::resize_pty(&state, session_id.as_deref(), cols, rows).map_err(Into::into)
}

#[tauri::command]
fn poll_events(
    state: State<'_, BackendState>,
    session_id: String,
) -> IpcResult<Vec<TerminalOutputEvent>> {
    terminal_service::poll_events(&state, &session_id).map_err(Into::into)
}

#[tauri::command]
fn test_ssh_connection(host: String, port: u16, username: String) -> IpcResult<String> {
    let _ = (host, port, username);
    Err(BackendError::not_implemented("ssh connection test").into())
}

#[tauri::command]
fn tcp_latency(host: String, port: u16, timeout_ms: Option<u64>) -> IpcResult<u64> {
    let _ = (host, port, timeout_ms);
    Err(BackendError::not_implemented("tcp latency").into())
}

#[tauri::command]
fn sftp_list(
    connection: SftpConnectionDto,
    path: String,
) -> IpcResult<Vec<crate::domain::sftp::SftpEntry>> {
    sftp_service::list(connection.into(), path).map_err(Into::into)
}

#[tauri::command]
fn sftp_mkdir(connection: SftpConnectionDto, remote_path: String) -> IpcResult<()> {
    sftp_service::mkdir(connection.into(), remote_path).map_err(Into::into)
}

#[tauri::command]
fn sftp_create_file(connection: SftpConnectionDto, remote_path: String) -> IpcResult<()> {
    sftp_service::create_file(connection.into(), remote_path).map_err(Into::into)
}

#[tauri::command]
fn sftp_rename(connection: SftpConnectionDto, old_path: String, new_path: String) -> IpcResult<()> {
    let request = SftpRenameRequest {
        connection,
        old_path,
        new_path,
    };
    sftp_service::rename(
        request.connection.into(),
        request.old_path,
        request.new_path,
    )
    .map_err(Into::into)
}

#[tauri::command]
fn sftp_delete(
    connection: SftpConnectionDto,
    remote_path: String,
    is_directory: Option<bool>,
) -> IpcResult<()> {
    let request = SftpDeleteRequest {
        connection,
        remote_path,
        is_directory,
    };
    sftp_service::delete(
        request.connection.into(),
        request.remote_path,
        request.is_directory,
    )
    .map_err(Into::into)
}

#[tauri::command]
fn sftp_upload(
    window: tauri::WebviewWindow,
    state: State<'_, BackendState>,
    connection: SftpConnectionDto,
    remote_path: String,
    data_base64: Option<String>,
    task_id: String,
    local_path: Option<String>,
) -> IpcResult<()> {
    let request = SftpTransferRequest {
        connection,
        remote_path,
        task_id,
        data_base64,
        local_path,
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
        if let Err(error) = sftp_service::upload_file_with_progress(
            Some(&window),
            Some(&state),
            Some(&request.task_id),
            request.connection.into(),
            request.remote_path,
            request.data_base64,
            request.local_path,
        ) {
            sftp_service::emit_sftp_failed(Some(&state), &window, &request.task_id, error.message);
        }
    });
    Ok(())
}

#[tauri::command]
fn sftp_upload_directory(
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
fn sftp_download(
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
fn sftp_read_file(connection: SftpConnectionDto, remote_path: String) -> IpcResult<String> {
    sftp_service::read_file(connection.into(), remote_path).map_err(Into::into)
}

#[tauri::command]
fn list_sftp_tasks(state: State<'_, BackendState>) -> IpcResult<Vec<SftpTaskSnapshot>> {
    sftp_service::list_sftp_tasks(&state).map_err(Into::into)
}

#[tauri::command]
fn cancel_sftp_task(state: State<'_, BackendState>, task_id: String) -> IpcResult<()> {
    state
        .cancelled_sftp_tasks
        .lock()
        .map_err(|_| BackendError::validation("sftp task state is unavailable"))?
        .insert(task_id.clone());
    sftp_service::mark_sftp_task_cancelled(&state, &task_id).map_err(Into::into)
}

fn clear_cancelled_sftp_task(state: &BackendState, task_id: &str) -> IpcResult<()> {
    state
        .cancelled_sftp_tasks
        .lock()
        .map_err(|_| BackendError::validation("sftp task state is unavailable"))?
        .remove(task_id);
    Ok(())
}

#[tauri::command]
fn keyring_store(service: String, key: String, value: String) -> IpcResult<()> {
    credential_service::store(CredentialRef::new(service, key), value).map_err(Into::into)
}

#[tauri::command]
fn keyring_get(service: String, key: String) -> IpcResult<Option<String>> {
    credential_service::get(CredentialRef::new(service, key)).map_err(Into::into)
}

#[tauri::command]
fn keyring_delete(service: String, key: String) -> IpcResult<()> {
    credential_service::delete(CredentialRef::new(service, key)).map_err(Into::into)
}
