use crate::{
    domain::terminal::{
        ConnectTerminalRequest, TerminalOutputEvent, TerminalSession, TerminalStatus,
    },
    error::{BackendError, BackendResult},
    state::BackendState,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
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
        status: TerminalStatus::Connected,
    };

    state
        .terminals
        .lock()
        .map_err(|_| BackendError::validation("terminal state is unavailable"))?
        .insert(session.id.clone(), session.clone());

    push_output_event(
        state,
        &session.id,
        format!("Connected to {}@{}\r\n", session.username, session.host),
    )?;

    Ok(session)
}

pub(crate) fn disconnect(state: &BackendState, session_id: &str) -> BackendResult<()> {
    state
        .terminals
        .lock()
        .map_err(|_| BackendError::validation("terminal state is unavailable"))?
        .remove(session_id);
    state
        .terminal_events
        .lock()
        .map_err(|_| BackendError::validation("terminal event state is unavailable"))?
        .remove(session_id);
    Ok(())
}

pub(crate) fn send_input(
    state: &BackendState,
    session_id: &str,
    data_base64: String,
) -> BackendResult<()> {
    ensure_terminal_exists(state, session_id)?;
    let input = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|_| BackendError::validation("terminal input must be base64"))?;
    let input = String::from_utf8_lossy(&input);
    push_output_event(state, session_id, input.into_owned())
}

pub(crate) fn resize_pty(
    state: &BackendState,
    session_id: Option<&str>,
    cols: u16,
    rows: u16,
) -> BackendResult<()> {
    if cols == 0 || rows == 0 {
        return Err(BackendError::validation(
            "terminal dimensions must be greater than zero",
        ));
    }
    if let Some(session_id) = session_id {
        ensure_terminal_exists(state, session_id)?;
    }
    Ok(())
}

pub(crate) fn poll_events(
    state: &BackendState,
    session_id: &str,
) -> BackendResult<Vec<TerminalOutputEvent>> {
    ensure_terminal_exists(state, session_id)?;
    let mut events = state
        .terminal_events
        .lock()
        .map_err(|_| BackendError::validation("terminal event state is unavailable"))?;
    Ok(events.remove(session_id).unwrap_or_default())
}

fn ensure_terminal_exists(state: &BackendState, session_id: &str) -> BackendResult<()> {
    let terminals = state
        .terminals
        .lock()
        .map_err(|_| BackendError::validation("terminal state is unavailable"))?;
    if terminals.contains_key(session_id) {
        Ok(())
    } else {
        Err(BackendError::validation("terminal session was not found"))
    }
}

fn push_output_event(state: &BackendState, session_id: &str, text: String) -> BackendResult<()> {
    state
        .terminal_events
        .lock()
        .map_err(|_| BackendError::validation("terminal event state is unavailable"))?
        .entry(session_id.to_string())
        .or_default()
        .push(TerminalOutputEvent::Output {
            data_base64: STANDARD.encode(text.as_bytes()),
        });
    Ok(())
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
