#[path = "terminal_service/events.rs"]
mod events;

use crate::{
    domain::terminal::{
        ConnectTerminalRequest, TerminalOutputEvent, TerminalSession, TerminalStatus,
    },
    error::{BackendError, BackendResult},
    infrastructure::{
        event_bus::EventSink,
        known_hosts_store::{HostKeyVerification, KnownHostsStore},
        ssh_client::{SshClient, SshRuntime},
    },
    services::sftp_service,
    state::{prune_expired_pending_host_key_sessions, BackendState, PendingHostKeySession},
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use events::{
    emit_host_key_requested, emit_terminal_closed, emit_terminal_error, emit_terminal_output,
    HostKeyRequestedPayload,
};
use std::{
    sync::mpsc,
    thread,
    time::{Duration, Instant, SystemTime},
};
use tauri::Manager;
use uuid::Uuid;

#[derive(Clone)]
pub(crate) struct TerminalRuntime {
    command_sender: mpsc::Sender<TerminalRuntimeCommand>,
}

enum TerminalRuntimeCommand {
    Read(mpsc::Sender<BackendResult<(String, bool)>>),
    Write(Vec<u8>, mpsc::Sender<BackendResult<String>>),
    Resize(u16, u16, mpsc::Sender<BackendResult<()>>),
    Keepalive(mpsc::Sender<BackendResult<()>>),
    Close(mpsc::Sender<BackendResult<()>>),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum TerminalRuntimeState {
    Ready,
    Closing,
    Closed,
}

impl TerminalRuntimeState {
    fn allows_io(self) -> bool {
        matches!(self, Self::Ready)
    }
}

impl TerminalRuntime {
    fn spawn(session_id: String, ssh_runtime: SshRuntime) -> Self {
        let (command_sender, command_receiver) = mpsc::channel();
        thread::spawn(move || terminal_runtime_loop(session_id, ssh_runtime, command_receiver));
        Self { command_sender }
    }

    fn read_output(&self) -> BackendResult<(String, bool)> {
        let (sender, receiver) = mpsc::channel();
        self.send_command(TerminalRuntimeCommand::Read(sender))?;
        receive_runtime_response(receiver)
    }

    fn write_input(&self, input: Vec<u8>) -> BackendResult<String> {
        let (sender, receiver) = mpsc::channel();
        self.send_command(TerminalRuntimeCommand::Write(input, sender))?;
        receive_runtime_response(receiver)
    }

    fn resize_pty(&self, cols: u16, rows: u16) -> BackendResult<()> {
        let (sender, receiver) = mpsc::channel();
        self.send_command(TerminalRuntimeCommand::Resize(cols, rows, sender))?;
        receive_runtime_response(receiver)
    }

    fn keepalive(&self) -> BackendResult<()> {
        let (sender, receiver) = mpsc::channel();
        self.send_command(TerminalRuntimeCommand::Keepalive(sender))?;
        receive_runtime_response(receiver)
    }

    fn close(&self) -> BackendResult<()> {
        let (sender, receiver) = mpsc::channel();
        self.send_command(TerminalRuntimeCommand::Close(sender))?;
        receive_runtime_response(receiver)
    }

    fn send_command(&self, command: TerminalRuntimeCommand) -> BackendResult<()> {
        self.command_sender
            .send(command)
            .map_err(|_| BackendError::validation("terminal runtime is not available"))
    }
}

fn receive_runtime_response<T>(receiver: mpsc::Receiver<BackendResult<T>>) -> BackendResult<T> {
    receiver
        .recv()
        .map_err(|_| BackendError::validation("terminal runtime stopped unexpectedly"))?
}

fn terminal_runtime_loop(
    session_id: String,
    mut ssh_runtime: SshRuntime,
    command_receiver: mpsc::Receiver<TerminalRuntimeCommand>,
) {
    let mut runtime_state = TerminalRuntimeState::Ready;
    for command in command_receiver {
        match command {
            TerminalRuntimeCommand::Read(response) => {
                let started = Instant::now();
                let result = if runtime_state.allows_io() {
                    read_runtime_output(&mut ssh_runtime).map(|output| {
                        let closed = SshClient::is_channel_eof(&ssh_runtime);
                        if closed {
                            runtime_state = TerminalRuntimeState::Closed;
                        }
                        (output, closed)
                    })
                } else {
                    Err(runtime_not_ready_error(runtime_state))
                };
                trace_terminal_command(&session_id, "read", started);
                let _ = response.send(result);
            }
            TerminalRuntimeCommand::Write(input, response) => {
                let started = Instant::now();
                let result = if runtime_state.allows_io() {
                    read_runtime_output(&mut ssh_runtime).and_then(|pending_output| {
                        write_all_nonblocking(&mut ssh_runtime, &input).map(|_| pending_output)
                    })
                } else {
                    Err(runtime_not_ready_error(runtime_state))
                };
                trace_terminal_command(&session_id, "write", started);
                let _ = response.send(result);
            }
            TerminalRuntimeCommand::Resize(cols, rows, response) => {
                let started = Instant::now();
                let result = if runtime_state.allows_io() {
                    SshClient::resize_pty(&mut ssh_runtime, cols, rows)
                } else {
                    Err(runtime_not_ready_error(runtime_state))
                };
                trace_terminal_command(&session_id, "resize", started);
                let _ = response.send(result);
            }
            TerminalRuntimeCommand::Keepalive(response) => {
                let started = Instant::now();
                let result = if runtime_state.allows_io() {
                    ssh_runtime
                        .channel
                        .request_pty_size(80, 24, None, None)
                        .map_err(|error| {
                            BackendError::terminal(format!("keepalive failed: {error}"))
                        })
                } else {
                    Err(runtime_not_ready_error(runtime_state))
                };
                trace_terminal_command(&session_id, "keepalive", started);
                let _ = response.send(result);
            }
            TerminalRuntimeCommand::Close(response) => {
                let started = Instant::now();
                runtime_state = TerminalRuntimeState::Closing;
                trace_terminal_state(&session_id, runtime_state);
                SshClient::close_channel(&mut ssh_runtime);
                runtime_state = TerminalRuntimeState::Closed;
                trace_terminal_state(&session_id, runtime_state);
                trace_terminal_command(&session_id, "close", started);
                let _ = response.send(Ok(()));
                break;
            }
        }
    }
    tracing::debug!(session_id, "terminal runtime actor stopped");
}

fn runtime_not_ready_error(state: TerminalRuntimeState) -> BackendError {
    BackendError::terminal(format!("terminal runtime is {state:?}"))
}

fn trace_terminal_command(session_id: &str, command: &str, started: Instant) {
    tracing::trace!(
        session_id,
        command,
        elapsed_ms = started.elapsed().as_millis() as u64,
        "terminal runtime command handled"
    );
}

fn trace_terminal_state(session_id: &str, state: TerminalRuntimeState) {
    tracing::trace!(session_id, state = ?state, "terminal runtime state changed");
}

pub(crate) fn connect(
    window: &tauri::WebviewWindow,
    state: &BackendState,
    request: ConnectTerminalRequest,
) -> BackendResult<TerminalSession> {
    tracing::info!(host = %request.host, port = request.port, username = %request.username, "connecting terminal");
    validate_terminal_request(&request)?;

    // Phase 1: TCP + SSH handshake, get host key
    let (session, host_key_info) = SshClient::connect_phase1(&request.host, request.port)?;

    // Check known_hosts
    let known_hosts = KnownHostsStore::new(state.paths.known_hosts_path());
    match known_hosts.verify(
        &request.host,
        request.port,
        &host_key_info.fingerprint,
        &host_key_info.key_type,
    )? {
        HostKeyVerification::Accepted => {
            // Known and matches, continue with authentication
            let ssh_runtime = SshClient::connect_phase2(session, &request)?;
            let session = create_terminal_session(window, state, request, ssh_runtime)?;
            tracing::info!(session_id = %session.id, "terminal connected successfully");
            Ok(session)
        }
        HostKeyVerification::Changed {
            expected_fingerprint,
        } => {
            // Host key changed - security risk!
            tracing::warn!(host = %request.host, port = request.port, expected = %expected_fingerprint, "host key changed - possible MITM");
            emit_host_key_requested(
                window,
                HostKeyRequestedPayload {
                    pending_id: String::new(),
                    host: request.host.clone(),
                    port: request.port,
                    fingerprint: host_key_info.fingerprint,
                    key_type: host_key_info.key_type,
                    reason: "changed".to_string(),
                    known_fingerprint: Some(expected_fingerprint.clone()),
                },
            );
            Err(BackendError::host_key_changed(format!(
                "host key for {}:{} has changed. Expected: {}",
                request.host, request.port, expected_fingerprint
            )))
        }
        HostKeyVerification::Unknown { .. } => {
            // Unknown host key - store pending session and emit event
            tracing::info!(host = %request.host, port = request.port, "unknown host key, awaiting user acceptance");
            let pending_id = Uuid::new_v4().to_string();
            let mut pending = state.pending_host_key_sessions.lock();
            pending.insert(
                pending_id.clone(),
                PendingHostKeySession {
                    host: request.host.clone(),
                    port: request.port,
                    username: request.username.clone(),
                    session,
                    fingerprint: host_key_info.fingerprint.clone(),
                    key_type: host_key_info.key_type.clone(),
                    created_at: SystemTime::now(),
                    raw_key: host_key_info.raw_key,
                },
            );
            drop(pending);

            emit_host_key_requested(
                window,
                HostKeyRequestedPayload {
                    pending_id: pending_id.clone(),
                    host: request.host.clone(),
                    port: request.port,
                    fingerprint: host_key_info.fingerprint,
                    key_type: host_key_info.key_type,
                    reason: "unknown".to_string(),
                    known_fingerprint: None,
                },
            );

            Err(BackendError::host_key_unknown(format!(
                "unknown host key for {}:{}, pending_id: {}",
                request.host, request.port, pending_id
            )))
        }
    }
}

/// Accept a pending host key and complete the SSH connection
pub(crate) fn accept_host_key(
    window: &tauri::WebviewWindow,
    state: &BackendState,
    pending_id: &str,
    request: ConnectTerminalRequest,
) -> BackendResult<TerminalSession> {
    prune_expired_pending_host_key_sessions(state);
    let pending = state
        .pending_host_key_sessions
        .lock()
        .remove(pending_id)
        .ok_or_else(|| BackendError::validation("pending host key session not found"))?;

    // Save to known_hosts
    let known_hosts = KnownHostsStore::new(state.paths.known_hosts_path());
    known_hosts.accept(
        &pending.host,
        pending.port,
        &pending.key_type,
        &pending.fingerprint,
    )?;

    // Continue with phase 2
    let ssh_runtime = SshClient::connect_phase2(pending.session, &request)?;
    create_terminal_session(window, state, request, ssh_runtime)
}

/// Reject a pending host key
pub(crate) fn reject_host_key(state: &BackendState, pending_id: &str) -> BackendResult<()> {
    prune_expired_pending_host_key_sessions(state);
    state.pending_host_key_sessions.lock().remove(pending_id);
    Ok(())
}

fn create_terminal_session(
    window: &tauri::WebviewWindow,
    state: &BackendState,
    request: ConnectTerminalRequest,
    ssh_runtime: SshRuntime,
) -> BackendResult<TerminalSession> {
    let id = Uuid::new_v4().to_string();
    let host = request.host.clone();
    let username = request.username.clone();
    let runtime = TerminalRuntime::spawn(id.clone(), ssh_runtime);

    // Start keepalive thread for this session (every 30 seconds)
    start_keepalive(window, &id);

    let session = TerminalSession {
        id: id.clone(),
        host,
        username,
        status: TerminalStatus::Connected,
    };

    state.terminals.lock().insert(id.clone(), session.clone());
    state.terminal_runtimes.lock().insert(id, runtime);

    Ok(session)
}

/// Start a keepalive thread that sends SSH ignore messages periodically
fn start_keepalive(window: &tauri::WebviewWindow, session_id: &str) {
    let session_id = session_id.to_string();
    let window = window.clone();

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(30));

            let state = window.state::<BackendState>();
            let runtime = {
                let runtimes = state.terminal_runtimes.lock();
                runtimes.get(&session_id).cloned()
            };
            let Some(runtime) = runtime else {
                // Session disconnected, exit keepalive
                break;
            };

            if let Err(error) = runtime.keepalive() {
                let message = format!("Terminal connection lost: {}", error.message);
                tracing::warn!(session_id = %session_id, error = %message, "keepalive failed, closing terminal session");
                emit_terminal_error(&window, &session_id, message);
                close_terminal_session(&window, &session_id);
                break;
            }

            tracing::debug!(session_id = %session_id, "keepalive sent");
        }
    });
}

pub(crate) fn disconnect(
    event_sink: &impl EventSink,
    state: &BackendState,
    session_id: &str,
) -> BackendResult<()> {
    tracing::info!(session_id, "disconnecting terminal");
    if let Some(runtime) = state.terminal_runtimes.lock().remove(session_id) {
        let _ = runtime.close();
    }
    state.terminals.lock().remove(session_id);
    state.terminal_events.lock().remove(session_id);

    // 通知前端该终端已关闭
    emit_terminal_closed(event_sink, session_id);
    Ok(())
}

pub(crate) fn start_output_reader(window: tauri::WebviewWindow, session_id: String) {
    thread::spawn(move || {
        let exit_reason = output_reader_loop(&window, &session_id);
        cleanup_after_output_exit(&window, &session_id, &exit_reason);
    });
}

/// Read terminal output until the runtime is removed, EOF is reached, or a read error occurs.
fn output_reader_loop(window: &tauri::WebviewWindow, session_id: &str) -> String {
    loop {
        let read_result = {
            let state = window.state::<BackendState>();
            let runtime = {
                let runtimes = state.terminal_runtimes.lock();
                runtimes.get(session_id).cloned()
            };
            let Some(runtime) = runtime else {
                break "runtime removed from registry".to_string();
            };
            runtime.read_output()
        };

        match read_result {
            Ok((output, closed)) => {
                if !output.is_empty() {
                    emit_terminal_output(window, session_id, output);
                }
                if closed {
                    emit_terminal_closed(window, session_id);
                    break "remote shell closed (eof)".to_string();
                }
            }
            Err(error) => {
                emit_terminal_error(window, session_id, error.message);
                break "output read error".to_string();
            }
        }

        thread::sleep(Duration::from_millis(16));
    }
}

fn cleanup_after_output_exit(window: &tauri::WebviewWindow, session_id: &str, reason: &str) {
    tracing::info!(session_id, reason, "terminal output reader exited");
    close_terminal_session(window, session_id);
}

fn close_terminal_session(window: &tauri::WebviewWindow, session_id: &str) {
    let state = window.state::<BackendState>();
    let mut should_emit_closed = false;

    if let Some(runtime) = state.terminal_runtimes.lock().remove(session_id) {
        let _ = runtime.close();
        should_emit_closed = true;
    }

    {
        let mut terminals = state.terminals.lock();
        if let Some(session) = terminals.get_mut(session_id) {
            let dropped_sftp_sessions = sftp_service::drop_cached_sftp_sessions_for_terminal(
                &state,
                &session.host,
                &session.username,
            );
            if dropped_sftp_sessions > 0 {
                tracing::debug!(
                    session_id,
                    count = dropped_sftp_sessions,
                    "dropped cached SFTP sessions after terminal close"
                );
            }
            if session.status != TerminalStatus::Disconnected {
                session.status = TerminalStatus::Disconnected;
                should_emit_closed = true;
            }
        }
    }

    if should_emit_closed {
        emit_terminal_closed(window, session_id);
    }
}

pub(crate) fn send_input(
    state: &BackendState,
    session_id: &str,
    data_base64: String,
) -> BackendResult<()> {
    let input = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|_| BackendError::validation("terminal input must be base64"))?;
    let pending_output = get_terminal_runtime(state, session_id)?.write_input(input)?;

    if !pending_output.is_empty() {
        push_output_event(state, session_id, pending_output)?;
    }

    Ok(())
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
        get_terminal_runtime(state, session_id)?.resize_pty(cols, rows)?;
    }
    Ok(())
}

pub(crate) fn poll_events(
    state: &BackendState,
    session_id: &str,
) -> BackendResult<Vec<TerminalOutputEvent>> {
    ensure_terminal_exists(state, session_id)?;
    let output = read_available_output(state, session_id)?;
    if !output.is_empty() {
        push_output_event(state, session_id, output)?;
    }

    let mut events = state.terminal_events.lock();
    Ok(events.remove(session_id).unwrap_or_default())
}

fn read_available_output(state: &BackendState, session_id: &str) -> BackendResult<String> {
    get_terminal_runtime(state, session_id)?
        .read_output()
        .map(|(output, _)| output)
}

fn read_runtime_output(ssh_runtime: &mut SshRuntime) -> BackendResult<String> {
    SshClient::read_output(ssh_runtime)
}

fn write_all_nonblocking(ssh_runtime: &mut SshRuntime, input: &[u8]) -> BackendResult<()> {
    SshClient::write_input(ssh_runtime, input)
}

fn get_terminal_runtime(state: &BackendState, session_id: &str) -> BackendResult<TerminalRuntime> {
    state
        .terminal_runtimes
        .lock()
        .get(session_id)
        .cloned()
        .ok_or_else(|| BackendError::validation("terminal session was not found"))
}

fn ensure_terminal_exists(state: &BackendState, session_id: &str) -> BackendResult<()> {
    let terminals = state.terminals.lock();
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
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{runtime_not_ready_error, HostKeyRequestedPayload, TerminalRuntimeState};
    use serde_json::json;

    #[test]
    fn host_key_requested_payload_serializes_changed_reason() {
        let payload = HostKeyRequestedPayload {
            pending_id: String::new(),
            host: "example.com".to_string(),
            port: 22,
            fingerprint: "SHA256:new-key".to_string(),
            key_type: "ssh-ed25519".to_string(),
            reason: "changed".to_string(),
            known_fingerprint: Some("SHA256:old-key".to_string()),
        };

        let value = serde_json::to_value(payload).expect("serialize host key payload");

        assert_eq!(
            value,
            json!({
                "pendingId": "",
                "host": "example.com",
                "port": 22,
                "fingerprint": "SHA256:new-key",
                "keyType": "ssh-ed25519",
                "reason": "changed",
                "knownFingerprint": "SHA256:old-key"
            })
        );
    }

    #[test]
    fn terminal_runtime_state_only_allows_io_when_ready() {
        assert!(TerminalRuntimeState::Ready.allows_io());
        assert!(!TerminalRuntimeState::Closing.allows_io());
        assert!(!TerminalRuntimeState::Closed.allows_io());
    }

    #[test]
    fn terminal_runtime_not_ready_error_is_terminal_error() {
        let error = runtime_not_ready_error(TerminalRuntimeState::Closed);

        assert_eq!(error.code, "terminalError");
        assert_eq!(error.message, "terminal runtime is Closed");
    }
}
