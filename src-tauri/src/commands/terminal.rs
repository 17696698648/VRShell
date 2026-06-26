use crate::{
    domain::credential::CredentialRef,
    ipc::{dto::ConnectSshRequest, IpcResult},
    services::terminal_service,
    state::BackendState,
};
use tauri::State;

#[tauri::command]
pub fn connect_ssh(
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
    credential_ref: Option<CredentialRef>,
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
        credential_ref,
    };
    terminal_service::connect(&window, &state, request.into())
        .map(|session| {
            terminal_service::start_output_reader(window, session.id.clone());
            session.id
        })
        .map_err(Into::into)
}

#[tauri::command]
pub fn send_input(
    state: State<'_, BackendState>,
    session_id: String,
    data_base64: String,
) -> IpcResult<()> {
    terminal_service::send_input(&state, &session_id, data_base64).map_err(Into::into)
}

#[tauri::command]
pub fn disconnect_session(
    window: tauri::WebviewWindow,
    state: State<'_, BackendState>,
    session_id: String,
) -> IpcResult<()> {
    terminal_service::disconnect(&window, &state, &session_id).map_err(Into::into)
}

#[tauri::command]
pub fn resize_pty(
    state: State<'_, BackendState>,
    session_id: Option<String>,
    cols: u16,
    rows: u16,
) -> IpcResult<()> {
    terminal_service::resize_pty(&state, session_id.as_deref(), cols, rows).map_err(Into::into)
}

#[tauri::command]
pub fn poll_events(
    state: State<'_, BackendState>,
    session_id: String,
) -> IpcResult<Vec<crate::domain::terminal::TerminalOutputEvent>> {
    terminal_service::poll_events(&state, &session_id).map_err(Into::into)
}

#[tauri::command]
pub fn test_ssh_connection(host: String, port: u16, username: String) -> IpcResult<String> {
    let request = crate::domain::terminal::ConnectTerminalRequest {
        host,
        port,
        username,
        password: None,
        private_key_path: None,
        passphrase: None,
        auth_method: Some("agent".to_string()),
        auto_reconnect: None,
        idle_timeout_secs: None,
        credential_ref: None,
    };
    crate::infrastructure::ssh_client::SshClient::test_connection(&request).map_err(Into::into)
}

#[tauri::command]
pub fn tcp_latency(host: String, port: u16, timeout_ms: Option<u64>) -> IpcResult<u64> {
    crate::infrastructure::ssh_client::SshClient::measure_tcp_latency(&host, port, timeout_ms)
        .map_err(Into::into)
}
