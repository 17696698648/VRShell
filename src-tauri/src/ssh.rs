use crate::sessions::{push_output_event, AppState, ControlMessage, SessionHandle, TerminalEvent};
use crate::{config, connect};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::{
    collections::VecDeque,
    io::{Read, Write},
    net::{TcpStream, ToSocketAddrs},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{Emitter, State};

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn connect_ssh(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
    passphrase: Option<String>,
    auto_reconnect: Option<bool>,
    idle_timeout_secs: Option<u64>,
) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let thread_session_id = session_id.clone();
    let (tx, rx) = std::sync::mpsc::channel::<ControlMessage>();
    let output_queue: Arc<Mutex<VecDeque<String>>> = Arc::new(Mutex::new(VecDeque::new()));
    let thread_output_queue = output_queue.clone();

    {
        let mut map = state
            .sessions
            .lock()
            .map_err(|e| format!("state lock err: {}", e))?;
        map.insert(
            session_id.clone(),
            SessionHandle {
                sender: tx.clone(),
                output: output_queue.clone(),
                thread: None,
                host: host.clone(),
                port,
                username: username.clone(),
            },
        );
    }

    let app = app_handle.clone();
    let host_clone = host.clone();
    let user = username.clone();
    let pass = password.clone();
    let key_path = private_key_path.clone();
    let key_passphrase = passphrase.clone();
    let host_key_cache = state.pending_host_keys.clone();
    let interaction_ctx = crate::interaction::InteractionContext::from_state(&state);
    let out_queue_for_thread = thread_output_queue.clone();

    let auto_reconnect = auto_reconnect.unwrap_or(false);
    let idle_timeout = Duration::from_secs(idle_timeout_secs.unwrap_or(0));
    let max_retries: u32 = if auto_reconnect {
        config::SSH_AUTO_RECONNECT_RETRIES
    } else {
        0
    };

    let join_handle = thread::Builder::new()
        .name(format!("ssh-{}", &session_id[..8]))
        .spawn(move || {
            let emit_terminal_error = |message: String| {
                let message = crate::sanitize::redact_sensitive(message);
                let payload =
                    serde_json::json!({"session_id": thread_session_id.clone(), "message": message});
                let _ = app.emit("terminal-error", payload.clone());
                push_output_event(
                    &out_queue_for_thread,
                    serde_json::json!({"event":"terminal-error","payload": payload}).to_string(),
                );
            };
            let emit_terminal_host_key_error = |error: connect::SshError| {
                let payload = serde_json::json!({
                    "session_id": thread_session_id.clone(),
                    "message": error.message,
                    "code": error.code,
                    "recoverable": error.recoverable,
                    "details": error.details,
                });
                let _ = app.emit("terminal-error", payload.clone());
                push_output_event(
                    &out_queue_for_thread,
                    serde_json::json!({"event":"terminal-error","payload": payload}).to_string(),
                );
            };
            let emit_terminal_info = |message: String| {
                let payload =
                    serde_json::json!({"session_id": thread_session_id.clone(), "message": message});
                let _ = app.emit("terminal-info", payload.clone());
                push_output_event(
                    &out_queue_for_thread,
                    serde_json::json!({"event":"terminal-info","payload": payload}).to_string(),
                );
            };

            let mut retry_count: u32 = 0;
            let mut intentional_close = false;
            let mut connected_once = false;

            'session: loop {
                // ---------- connect ----------
                let conn = match connect::connect_ssh_session(connect::ConnectOptions {
                    host: &host_clone,
                    port,
                    auth: connect::AuthOptions {
                        username: &user,
                        password: pass.as_deref(),
                        private_key_path: key_path.as_deref(),
                        passphrase: key_passphrase.as_deref(),
                    },
                    connect_timeout: Some(config::ssh_connect_timeout()),
                    verify_known_hosts: true,
                    host_key_cache: Some(&host_key_cache),
                    known_hosts_path_override: None,
                    interaction: connect::InteractionOptions {
                        context: Some(&interaction_ctx),
                        app: Some(&app),
                        session_id: Some(&thread_session_id),
                        output_queue: Some(&out_queue_for_thread),
                        interactive: true,
                    },
                }) {
                    Ok(c) => {
                        retry_count = 0;
                        c
                    }
                    Err(e) => {
                        // In interactive mode host-key rejection comes as "cancelled".
                        // Legacy non-interactive errors are also handled here for
                        // backward compatibility (e.g. SFTP, test path).
                        if e.code == "cancelled"
                            || e.code == "host_key_unknown"
                            || e.code == "host_key_mismatch"
                        {
                            if e.code == "cancelled" {
                                emit_terminal_error(e.to_string());
                            } else {
                                emit_terminal_host_key_error(e);
                            }
                        } else if retry_count < max_retries {
                            retry_count += 1;
                            let retry_label = if connected_once {
                                "Reconnecting"
                            } else {
                                "Retrying connection"
                            };
                            emit_terminal_info(format!(
                                "{} ({}/{})…",
                                retry_label, retry_count, max_retries
                            ));
                            thread::sleep(Duration::from_secs(1 << retry_count));
                            continue 'session;
                        } else {
                            emit_terminal_error(e.to_string());
                        }
                        break 'session;
                    }
                };
                let sess = conn.session;

                // ---------- channel + shell ----------
                let mut channel = match sess.channel_session() {
                    Ok(c) => c,
                    Err(e) => {
                        emit_terminal_error(format!("open channel err: {}", e));
                        if retry_count < max_retries {
                            retry_count += 1;
                            thread::sleep(Duration::from_secs(1 << retry_count));
                            continue 'session;
                        }
                        break 'session;
                    }
                };

                let _ = channel.request_pty("xterm", None, Some((80, 24, 0, 0)));
                if let Err(e) = channel.shell() {
                    emit_terminal_error(format!("channel shell err: {}", e));
                    if retry_count < max_retries {
                        retry_count += 1;
                        thread::sleep(Duration::from_secs(1 << retry_count));
                        continue 'session;
                    }
                    break 'session;
                }

                sess.set_blocking(false);
                connected_once = true;

                if retry_count > 0 {
                    emit_terminal_info("Reconnected.".to_string());
                }

                // ---------- I/O loop ----------
                let mut buf = [0u8; 16384];
                let mut pending_output = Vec::with_capacity(32768);
                let mut last_output_flush = Instant::now();
                let output_flush_interval = config::ssh_output_flush_interval();
                let max_pending_output = config::SSH_MAX_PENDING_OUTPUT_BYTES;
                let mut last_keepalive = Instant::now();
                let mut keepalive_failures: u32 = 0;
                let mut last_activity = Instant::now();

                let flush_terminal_output = |pending_output: &mut Vec<u8>| {
                    if pending_output.is_empty() {
                        return;
                    }
                    let b64 = STANDARD.encode(&pending_output);
                    pending_output.clear();
                    let evt = TerminalEvent {
                        session_id: thread_session_id.clone(),
                        data_base64: b64.clone(),
                    };
                    let _ = app.emit("terminal-data", evt);
                    push_output_event(
                        &out_queue_for_thread,
                        serde_json::json!({"event":"terminal-data","payload": {"session_id": thread_session_id.clone(), "data_base64": b64}}).to_string(),
                    );
                };

                loop {
                    match rx.recv_timeout(Duration::from_millis(25)) {
                        Ok(msg) => match msg {
                            ControlMessage::Input(input_bytes) => {
                                last_activity = Instant::now();
                                if let Err(e) = channel.write_all(&input_bytes) {
                                    emit_terminal_error(format!("channel write err: {}", e));
                                    break;
                                }
                                let _ = channel.flush();
                            }
                            ControlMessage::Resize(cols, rows) => {
                                let _ = channel.request_pty(
                                    "xterm",
                                    None,
                                    Some((cols as u32, rows as u32, 0, 0)),
                                );
                            }
                            ControlMessage::Close => {
                                intentional_close = true;
                                break;
                            }
                        },
                        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                            // idle timeout
                            if !idle_timeout.is_zero()
                                && last_activity.elapsed() >= idle_timeout
                            {
                                emit_terminal_info(
                                    "Session closed due to idle timeout".to_string(),
                                );
                                intentional_close = true;
                                break;
                            }
                            // keepalive every 30s
                            if last_keepalive.elapsed() >= config::ssh_keepalive_interval() {
                                last_keepalive = Instant::now();
                                match sess.keepalive_send() {
                                    Ok(_) => keepalive_failures = 0,
                                    Err(_) => {
                                        keepalive_failures += 1;
                                        if keepalive_failures >= config::SSH_MAX_KEEPALIVE_FAILURES {
                                            emit_terminal_error(
                                                "session keepalive failed — connection lost"
                                                    .to_string(),
                                            );
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                            break;
                        }
                    }

                    match channel.read(&mut buf) {
                        Ok(n) if n > 0 => {
                            last_activity = Instant::now();
                            pending_output.extend_from_slice(&buf[..n]);
                            if pending_output.len() >= max_pending_output
                                || last_output_flush.elapsed() >= output_flush_interval
                            {
                                flush_terminal_output(&mut pending_output);
                                last_output_flush = Instant::now();
                            }
                        }
                        Ok(_) => {
                            if channel.eof() {
                                emit_terminal_info(format!("session {} EOF", thread_session_id));
                                break;
                            }
                        }
                        Err(e) => {
                            if e.kind() != std::io::ErrorKind::WouldBlock {
                                emit_terminal_error(format!("channel read err: {}", e));
                                break;
                            }
                        }
                    }
                }

                flush_terminal_output(&mut pending_output);

                // ---------- cleanup ----------
                let _ = channel.close();
                let _ = channel.wait_close();

                if intentional_close || retry_count >= max_retries {
                    break 'session;
                }

                retry_count += 1;
                emit_terminal_info(format!(
                    "Reconnecting ({}/{})…",
                    retry_count, max_retries
                ));
                thread::sleep(Duration::from_secs(1 << retry_count));
            }

            // ---------- session ended ----------
            let _ = app.emit("terminal-closed", thread_session_id.clone());
            push_output_event(
                &out_queue_for_thread,
                serde_json::json!({"event":"terminal-closed","payload": thread_session_id.clone()})
                    .to_string(),
            );
        })
        .map_err(|e| format!("thread spawn err: {}", e))?;

    // Store the thread handle for later join on disconnect
    {
        let mut map = state
            .sessions
            .lock()
            .map_err(|e| format!("state lock err: {}", e))?;
        if let Some(handle) = map.get_mut(&session_id) {
            handle.thread = Some(join_handle);
        }
    }

    Ok(session_id)
}

#[tauri::command]
pub async fn send_input(
    state: State<'_, AppState>,
    session_id: String,
    data_base64: String,
) -> Result<(), String> {
    let map = state
        .sessions
        .lock()
        .map_err(|e| format!("lock err: {}", e))?;
    if let Some(handle) = map.get(&session_id) {
        let bytes = STANDARD
            .decode(&data_base64)
            .map_err(|e| format!("base64 decode error: {}", e))?;
        handle
            .sender
            .send(ControlMessage::Input(bytes))
            .map_err(|e| format!("send error: {}", e))?;
        Ok(())
    } else {
        Err(format!("session not found: {}", session_id))
    }
}

#[tauri::command]
pub async fn disconnect_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), String> {
    let mut map = state
        .sessions
        .lock()
        .map_err(|e| format!("lock err: {}", e))?;
    if let Some(handle) = map.remove(&session_id) {
        let _ = handle.sender.send(ControlMessage::Close);
        // Clean up the corresponding SFTP session
        let sftp_key = crate::sftp::sftp_session_key(&handle.host, handle.port, &handle.username);
        drop(map); // release sessions lock before acquiring sftp lock
        if let Ok(mut sftp_sessions) = state.sftp_sessions.lock() {
            sftp_sessions.remove(&sftp_key);
        }
        // Do not join here: a blocked SSH read/write could freeze the Tauri command
        // and make the UI feel hung. The worker observes ControlMessage::Close and
        // emits terminal-closed when it exits.
        drop(handle.thread);
    }
    Ok(())
}

#[tauri::command]
pub async fn resize_pty(
    _app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let map = state
        .sessions
        .lock()
        .map_err(|e| format!("lock err: {}", e))?;
    if let Some(handle) = map.get(&session_id) {
        handle
            .sender
            .send(ControlMessage::Resize(cols, rows))
            .map_err(|e| format!("send resize error: {}", e))?;
        Ok(())
    } else {
        Err(format!("session not found: {}", session_id))
    }
}

#[tauri::command]
pub async fn poll_events(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Vec<String>, String> {
    let map = state
        .sessions
        .lock()
        .map_err(|e| format!("lock err: {}", e))?;
    if let Some(handle) = map.get(&session_id) {
        // drain the queue with O(1) per-element pop_front
        let out = if let Ok(mut q) = handle.output.lock() {
            q.drain(..).collect()
        } else {
            Vec::new()
        };
        Ok(out)
    } else {
        Err(format!("session not found: {}", session_id))
    }
}

#[tauri::command]
pub async fn test_ssh_connection(
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
    passphrase: Option<String>,
) -> Result<u64, String> {
    let start = Instant::now();
    connect::connect_ssh_session(connect::ConnectOptions {
        host: &host,
        port,
        auth: connect::AuthOptions {
            username: &username,
            password: password.as_deref(),
            private_key_path: private_key_path.as_deref(),
            passphrase: passphrase.as_deref(),
        },
        connect_timeout: Some(Duration::from_secs(5)),
        verify_known_hosts: false,
        host_key_cache: None,
        known_hosts_path_override: None,
        interaction: connect::InteractionOptions::none(),
    })
    .map_err(|e| e.to_string())?;
    let latency_ms = start.elapsed().as_millis() as u64;
    Ok(latency_ms)
}

/// Lightweight TCP ping — no SSH handshake, just measures RTT to host:port
#[tauri::command]
pub async fn tcp_latency(host: String, port: u16) -> Result<u64, String> {
    let start = Instant::now();
    let addr = format!("{}:{}", host, port);
    let socket_addr = addr
        .to_socket_addrs()
        .map_err(|e| format!("resolve addr error: {}", e))?
        .next()
        .ok_or_else(|| format!("no address for {}", addr))?;
    TcpStream::connect_timeout(&socket_addr, Duration::from_secs(3))
        .map_err(|e| format!("tcp connect error: {}", e))?;
    Ok(start.elapsed().as_millis() as u64)
}
