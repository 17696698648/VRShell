use crate::{
    domain::{
        credential::CredentialRef, session::SessionGroup, session_tree::SessionTreeActionPayload,
        ssh_config::SshConfigHost,
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
use tauri::State;

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
        sftp_rename,
        sftp_delete,
        sftp_upload,
        sftp_download,
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
    state: State<'_, BackendState>,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
    passphrase: Option<String>,
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
        auto_reconnect,
        idle_timeout_secs,
    };
    terminal_service::connect(&state, request.into())
        .map(|session| session.id)
        .map_err(Into::into)
}

#[tauri::command]
fn send_input(session_id: String, data_base64: String) -> IpcResult<()> {
    let _ = (session_id, data_base64);
    Err(BackendError::not_implemented("terminal input").into())
}

#[tauri::command]
fn disconnect_session(state: State<'_, BackendState>, session_id: String) -> IpcResult<()> {
    terminal_service::disconnect(&state, &session_id).map_err(Into::into)
}

#[tauri::command]
fn resize_pty(session_id: Option<String>, cols: u16, rows: u16) -> IpcResult<()> {
    let _ = (session_id, cols, rows);
    Err(BackendError::not_implemented("terminal resize").into())
}

#[tauri::command]
fn poll_events(state: State<'_, BackendState>, session_id: String) -> IpcResult<Vec<String>> {
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
    let _ = (connection, remote_path);
    sftp_service::mutate_file_system("sftp mkdir").map_err(Into::into)
}

#[tauri::command]
fn sftp_rename(connection: SftpConnectionDto, old_path: String, new_path: String) -> IpcResult<()> {
    let request = SftpRenameRequest {
        connection,
        old_path,
        new_path,
    };
    let _ = request;
    sftp_service::mutate_file_system("sftp rename").map_err(Into::into)
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
    let _ = request;
    sftp_service::mutate_file_system("sftp delete").map_err(Into::into)
}

#[tauri::command]
fn sftp_upload(
    connection: SftpConnectionDto,
    remote_path: String,
    data_base64: String,
    task_id: String,
) -> IpcResult<()> {
    let request = SftpTransferRequest {
        connection,
        remote_path,
        task_id,
        data_base64: Some(data_base64),
    };
    let _ = request;
    sftp_service::mutate_file_system("sftp upload").map_err(Into::into)
}

#[tauri::command]
fn sftp_download(
    connection: SftpConnectionDto,
    remote_path: String,
    task_id: String,
) -> IpcResult<String> {
    let request = SftpTransferRequest {
        connection,
        remote_path,
        task_id,
        data_base64: None,
    };
    let _ = request;
    Err(BackendError::not_implemented("sftp download").into())
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
