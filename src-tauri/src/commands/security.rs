use crate::{
    domain::credential::CredentialRef,
    ipc::{dto::ConnectSshRequest, IpcResult},
    services::terminal_service,
    state::BackendState,
};
use tauri::State;

#[tauri::command]
pub fn accept_host_key(
    window: tauri::WebviewWindow,
    state: State<'_, BackendState>,
    pending_id: String,
    password: Option<String>,
    private_key_path: Option<String>,
    passphrase: Option<String>,
    auth_method: Option<String>,
    credential_ref: Option<CredentialRef>,
) -> IpcResult<String> {
    // Retrieve pending session info to build the request
    let (host, port, username) = {
        let pending = state.pending_host_key_sessions.lock();
        let session = pending.get(&pending_id).ok_or_else(|| {
            crate::error::BackendError::validation("pending host key session not found")
        })?;
        (session.host.clone(), session.port, session.username.clone())
    };

    let request = ConnectSshRequest {
        host,
        port,
        username,
        password,
        private_key_path,
        passphrase,
        auth_method,
        auto_reconnect: None,
        idle_timeout_secs: None,
        credential_ref,
    };

    terminal_service::accept_host_key(&window, &state, &pending_id, request.into())
        .map(|session| {
            terminal_service::start_output_reader(window, session.id.clone());
            session.id
        })
        .map_err(Into::into)
}

#[tauri::command]
pub fn reject_host_key(state: State<'_, BackendState>, pending_id: String) -> IpcResult<()> {
    terminal_service::reject_host_key(&state, &pending_id).map_err(Into::into)
}
