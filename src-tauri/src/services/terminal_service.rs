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
    state::{BackendState, PendingHostKeySession},
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use std::{
    thread,
    time::Duration,
};
use tauri::Manager;
use uuid::Uuid;

pub(crate) struct TerminalRuntime {
    ssh_runtime: SshRuntime,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalOutputEventPayload {
    session_id: String,
    data_base64: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalSessionEventPayload {
    session_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalErrorEventPayload {
    session_id: String,
    error: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct HostKeyRequestedPayload {
    pending_id: String,
    host: String,
    port: u16,
    fingerprint: String,
    key_type: String,
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
    let known_hosts = KnownHostsStore::new(KnownHostsStore::default_path());
    match known_hosts.verify(&request.host, request.port, &host_key_info.fingerprint, &host_key_info.key_type)? {
        HostKeyVerification::Accepted => {
            // Known and matches, continue with authentication
            let ssh_runtime = SshClient::connect_phase2(session, &request)?;
            let session = create_terminal_session(window, state, request, ssh_runtime)?;
            tracing::info!(session_id = %session.id, "terminal connected successfully");
            Ok(session)
        }
        HostKeyVerification::Changed { expected_fingerprint } => {
            // Host key changed - security risk!
            tracing::warn!(host = %request.host, port = request.port, expected = %expected_fingerprint, "host key changed - possible MITM");
            Err(BackendError::host_key_changed(format!(
                "host key for {}:{} has changed. Expected: {}",
                request.host, request.port, expected_fingerprint
            )))
        }
        HostKeyVerification::Unknown { .. } => {
            // Unknown host key - store pending session and emit event
            tracing::info!(host = %request.host, port = request.port, "unknown host key, awaiting user acceptance");
            let pending_id = Uuid::new_v4().to_string();
            let mut pending = state
                .pending_host_key_sessions
                .lock();
            pending.insert(
                pending_id.clone(),
                PendingHostKeySession {
                    host: request.host.clone(),
                    port: request.port,
                    username: request.username.clone(),
                    session,
                    fingerprint: host_key_info.fingerprint.clone(),
                    key_type: host_key_info.key_type.clone(),
                    raw_key: host_key_info.raw_key,
                },
            );
            drop(pending);

            // Emit host key requested event
            let _ = window.emit_event(
                crate::ipc::events::SECURITY_HOST_KEY_REQUESTED,
                HostKeyRequestedPayload {
                    pending_id: pending_id.clone(),
                    host: request.host.clone(),
                    port: request.port,
                    fingerprint: host_key_info.fingerprint,
                    key_type: host_key_info.key_type,
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
    let pending = state
        .pending_host_key_sessions
        .lock()
        .remove(pending_id)
        .ok_or_else(|| BackendError::validation("pending host key session not found"))?;

    // Save to known_hosts
    let known_hosts = KnownHostsStore::new(KnownHostsStore::default_path());
    known_hosts.accept(&pending.host, pending.port, &pending.key_type, &pending.fingerprint)?;

    // Continue with phase 2
    let ssh_runtime = SshClient::connect_phase2(pending.session, &request)?;
    create_terminal_session(window, state, request, ssh_runtime)
}

/// Reject a pending host key
pub(crate) fn reject_host_key(state: &BackendState, pending_id: &str) -> BackendResult<()> {
    state
        .pending_host_key_sessions
        .lock()
        .remove(pending_id);
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
    let runtime = TerminalRuntime { ssh_runtime };

    // Start keepalive thread for this session (every 30 seconds)
    start_keepalive(window, &id);

    let session = TerminalSession {
        id: id.clone(),
        host,
        username,
        status: TerminalStatus::Connected,
    };

    state
        .terminals
        .lock()
        .insert(id.clone(), session.clone());
    state
        .terminal_runtimes
        .lock()
        .insert(id, runtime);

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
            let mut runtimes = state.terminal_runtimes.lock();
            let Some(runtime) = runtimes.get_mut(&session_id) else {
                // Session disconnected, exit keepalive
                break;
            };
            
            // Send channel request to keep connection alive (resize to same size)
            if runtime.ssh_runtime.channel.request_pty_size(80, 24, None, None).is_err() {
                tracing::warn!(session_id = %session_id, "keepalive failed, connection may be dead");
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
    if let Some(mut runtime) = state
        .terminal_runtimes
        .lock()
        .remove(session_id)
    {
        SshClient::close_channel(&mut runtime.ssh_runtime);
    }
    state
        .terminals
        .lock()
        .remove(session_id);
    state
        .terminal_events
        .lock()
        .remove(session_id);

    // 通知前端该终端已关闭
    let _ = event_sink.emit_event(
        crate::ipc::events::TERMINAL_CLOSED,
        TerminalSessionEventPayload {
            session_id: session_id.to_string(),
        },
    );
    Ok(())
}

pub(crate) fn start_output_reader(window: tauri::WebviewWindow, session_id: String) {
    thread::spawn(move || {
        let exit_reason = output_reader_loop(&window, &session_id);
        cleanup_after_output_exit(&window, &session_id, &exit_reason);
    });
}

/// 输出读取循环，返回退出原因
fn output_reader_loop(
    window: &tauri::WebviewWindow,
    session_id: &str,
) -> String {
    loop {
        let read_result = {
            let state = window.state::<BackendState>();
            let mut runtimes = state.terminal_runtimes.lock();
            let Some(runtime) = runtimes.get_mut(session_id) else {
                break "runtime removed from registry".to_string();
            };
            let eof = SshClient::is_channel_eof(&runtime.ssh_runtime);
            read_runtime_output(runtime).map(|output| (output, eof))
        };

        match read_result {
            Ok((output, closed)) => {
                if !output.is_empty() {
                    let _ = emit_terminal_output(window, session_id, output);
                }
                if closed {
                    window.emit_event(
                        crate::ipc::events::TERMINAL_CLOSED,
                        TerminalSessionEventPayload {
                            session_id: session_id.to_string(),
                        },
                    );
                    break "remote shell closed (eof)".to_string();
                }
            }
            Err(error) => {
                let _ = emit_terminal_error(window, session_id, error.message);
                break "output read error".to_string();
            }
        }

        thread::sleep(Duration::from_millis(16));
    }
}

/// output reader 退出后清理 runtime 并更新 terminal 状态
fn cleanup_after_output_exit(
    window: &tauri::WebviewWindow,
    session_id: &str,
    reason: &str,
) {
    let state = window.state::<BackendState>();

    // 移除 runtime（channel 已不可用）
    {
        let mut runtimes = state.terminal_runtimes.lock();
        runtimes.remove(session_id);
    }

    // 更新 terminal session 状态为 Disconnected
    {
        let mut terminals = state.terminals.lock();
        if let Some(session) = terminals.get_mut(session_id) {
            session.status = TerminalStatus::Disconnected;
        }
    }

    // 确保前端收到 closed 事件
    window.emit_event(
        crate::ipc::events::TERMINAL_CLOSED,
        TerminalSessionEventPayload {
            session_id: session_id.to_string(),
        },
    );

    let _ = emit_terminal_error(
        window,
        session_id,
        format!("terminal output reader exited: {reason}"),
    );
}

pub(crate) fn send_input(
    state: &BackendState,
    session_id: &str,
    data_base64: String,
) -> BackendResult<()> {
    let input = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|_| BackendError::validation("terminal input must be base64"))?;
    let pending_output = {
        let mut runtimes = state
            .terminal_runtimes
            .lock();
        let runtime = runtimes
            .get_mut(session_id)
            .ok_or_else(|| BackendError::validation("terminal session was not found"))?;
        let pending_output = read_runtime_output(runtime)?;
        write_all_nonblocking(runtime, &input)?;
        pending_output
    };

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
        let mut runtimes = state
            .terminal_runtimes
            .lock();
        let runtime = runtimes
            .get_mut(session_id)
            .ok_or_else(|| BackendError::validation("terminal session was not found"))?;
        SshClient::resize_pty(&mut runtime.ssh_runtime, cols, rows)?;
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

    let mut events = state
        .terminal_events
        .lock();
    Ok(events.remove(session_id).unwrap_or_default())
}

fn read_available_output(state: &BackendState, session_id: &str) -> BackendResult<String> {
    let mut runtimes = state
        .terminal_runtimes
        .lock();
    let runtime = runtimes
        .get_mut(session_id)
        .ok_or_else(|| BackendError::validation("terminal session was not found"))?;
    read_runtime_output(runtime)
}

fn read_runtime_output(runtime: &mut TerminalRuntime) -> BackendResult<String> {
    SshClient::read_output(&mut runtime.ssh_runtime)
}

fn write_all_nonblocking(runtime: &mut TerminalRuntime, input: &[u8]) -> BackendResult<()> {
    SshClient::write_input(&mut runtime.ssh_runtime, input)
}

fn ensure_terminal_exists(state: &BackendState, session_id: &str) -> BackendResult<()> {
    let terminals = state
        .terminals
        .lock();
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

fn emit_terminal_output(
    event_sink: &impl EventSink,
    session_id: &str,
    text: String,
) {
    event_sink.emit_event(
        crate::ipc::events::TERMINAL_OUTPUT,
        TerminalOutputEventPayload {
            session_id: session_id.to_string(),
            data_base64: STANDARD.encode(text.as_bytes()),
        },
    );
}

fn emit_terminal_error(
    event_sink: &impl EventSink,
    session_id: &str,
    error: impl Into<String>,
) {
    event_sink.emit_event(
        crate::ipc::events::TERMINAL_ERROR,
        TerminalErrorEventPayload {
            session_id: session_id.to_string(),
            error: error.into(),
        },
    );
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
