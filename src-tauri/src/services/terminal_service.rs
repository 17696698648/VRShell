use crate::{
    domain::terminal::{ConnectTerminalRequest, TerminalSession, TerminalStatus},
    error::{BackendError, BackendResult},
    state::BackendState,
};
use uuid::Uuid;

pub(crate) fn connect(
    state: &BackendState,
    request: ConnectTerminalRequest,
) -> BackendResult<TerminalSession> {
    validate_terminal_request(&request)?;

    let session = TerminalSession {
        id: Uuid::new_v4().to_string(),
        host: request.host,
        username: request.username,
        status: TerminalStatus::Disconnected,
    };

    state
        .terminals
        .lock()
        .map_err(|_| BackendError::validation("terminal state is unavailable"))?
        .insert(session.id.clone(), session.clone());

    Ok(session)
}

pub(crate) fn disconnect(state: &BackendState, session_id: &str) -> BackendResult<()> {
    state
        .terminals
        .lock()
        .map_err(|_| BackendError::validation("terminal state is unavailable"))?
        .remove(session_id);
    Ok(())
}

pub(crate) fn poll_events(_state: &BackendState, _session_id: &str) -> BackendResult<Vec<String>> {
    Ok(Vec::new())
}

fn validate_terminal_request(request: &ConnectTerminalRequest) -> BackendResult<()> {
    if request.host.trim().is_empty() {
        return Err(BackendError::validation("host is required"));
    }
    if request.username.trim().is_empty() {
        return Err(BackendError::validation("username is required"));
    }
    if request.port == 0 {
        return Err(BackendError::validation("port must be greater than zero"));
    }

    let _auth_material = (
        &request.password,
        &request.private_key_path,
        &request.passphrase,
        &request.auto_reconnect,
        &request.idle_timeout_secs,
    );
    Ok(())
}
