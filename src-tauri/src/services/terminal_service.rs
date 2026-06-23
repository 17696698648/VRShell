use crate::{
    domain::terminal::{
        ConnectTerminalRequest, TerminalOutputEvent, TerminalSession, TerminalStatus,
    },
    error::{BackendError, BackendResult},
    state::BackendState,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use ssh2::{Channel, Session as SshSession};
use std::{
    env,
    io::{Read, Write},
    net::{TcpStream, ToSocketAddrs},
    path::PathBuf,
    time::Duration,
};
use uuid::Uuid;

pub(crate) struct TerminalRuntime {
    session: SshSession,
    channel: Channel,
}

pub(crate) fn connect(
    state: &BackendState,
    request: ConnectTerminalRequest,
) -> BackendResult<TerminalSession> {
    validate_terminal_request(&request)?;

    let id = Uuid::new_v4().to_string();
    let host = request.host.clone();
    let username = request.username.clone();
    let runtime = open_ssh_shell(&request)?;

    let session = TerminalSession {
        id: id.clone(),
        host,
        username,
        status: TerminalStatus::Connected,
    };

    state
        .terminals
        .lock()
        .map_err(|_| BackendError::validation("terminal state is unavailable"))?
        .insert(id.clone(), session.clone());
    state
        .terminal_runtimes
        .lock()
        .map_err(|_| BackendError::validation("terminal runtime state is unavailable"))?
        .insert(id, runtime);

    Ok(session)
}

pub(crate) fn disconnect(state: &BackendState, session_id: &str) -> BackendResult<()> {
    if let Some(mut runtime) = state
        .terminal_runtimes
        .lock()
        .map_err(|_| BackendError::validation("terminal runtime state is unavailable"))?
        .remove(session_id)
    {
        let _ = runtime.channel.close();
        let _ = runtime.channel.wait_close();
    }
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
    let input = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|_| BackendError::validation("terminal input must be base64"))?;
    let mut runtimes = state
        .terminal_runtimes
        .lock()
        .map_err(|_| BackendError::validation("terminal runtime state is unavailable"))?;
    let runtime = runtimes
        .get_mut(session_id)
        .ok_or_else(|| BackendError::validation("terminal session was not found"))?;
    runtime.channel.write_all(&input).map_err(|error| {
        BackendError::validation(format!("failed to write terminal input: {error}"))
    })?;
    runtime.channel.flush().map_err(|error| {
        BackendError::validation(format!("failed to flush terminal input: {error}"))
    })
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
            .lock()
            .map_err(|_| BackendError::validation("terminal runtime state is unavailable"))?;
        let runtime = runtimes
            .get_mut(session_id)
            .ok_or_else(|| BackendError::validation("terminal session was not found"))?;
        runtime
            .channel
            .request_pty_size(cols as u32, rows as u32, None, None)
            .map_err(|error| BackendError::validation(format!("failed to resize pty: {error}")))?;
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
        .lock()
        .map_err(|_| BackendError::validation("terminal event state is unavailable"))?;
    Ok(events.remove(session_id).unwrap_or_default())
}

fn open_ssh_shell(request: &ConnectTerminalRequest) -> BackendResult<TerminalRuntime> {
    let address = (request.host.as_str(), request.port)
        .to_socket_addrs()
        .map_err(|error| BackendError::validation(format!("failed to resolve host: {error}")))?
        .next()
        .ok_or_else(|| BackendError::validation("host did not resolve to an address"))?;
    let stream =
        TcpStream::connect_timeout(&address, Duration::from_secs(12)).map_err(|error| {
            BackendError::validation(format!("failed to connect ssh socket: {error}"))
        })?;
    stream
        .set_read_timeout(Some(Duration::from_secs(12)))
        .map_err(|error| {
            BackendError::validation(format!("failed to configure ssh socket: {error}"))
        })?;
    stream
        .set_write_timeout(Some(Duration::from_secs(12)))
        .map_err(|error| {
            BackendError::validation(format!("failed to configure ssh socket: {error}"))
        })?;

    let mut session = SshSession::new().map_err(|error| {
        BackendError::validation(format!("failed to create ssh session: {error}"))
    })?;
    session.set_tcp_stream(stream);
    session
        .handshake()
        .map_err(|error| BackendError::validation(format!("ssh handshake failed: {error}")))?;
    authenticate(&session, request)?;

    let mut channel = session.channel_session().map_err(|error| {
        BackendError::validation(format!("failed to open ssh channel: {error}"))
    })?;
    channel
        .request_pty("xterm-256color", None, Some((80, 24, 0, 0)))
        .map_err(|error| BackendError::validation(format!("failed to request pty: {error}")))?;
    channel.shell().map_err(|error| {
        BackendError::validation(format!("failed to start remote shell: {error}"))
    })?;
    session.set_blocking(false);

    Ok(TerminalRuntime { session, channel })
}

fn authenticate(session: &SshSession, request: &ConnectTerminalRequest) -> BackendResult<()> {
    match request.auth_method.as_deref().unwrap_or("agent") {
        "password" => authenticate_with_password(session, request)?,
        "key" => authenticate_with_private_key(session, request)?,
        "agent" => authenticate_with_agent(session, request)?,
        method => {
            return Err(BackendError::validation(format!(
                "unsupported ssh auth method: {method}"
            )))
        }
    }

    if session.authenticated() {
        Ok(())
    } else {
        Err(BackendError::credential("ssh authentication failed"))
    }
}

fn authenticate_with_password(
    session: &SshSession,
    request: &ConnectTerminalRequest,
) -> BackendResult<()> {
    let password = request
        .password
        .as_deref()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| BackendError::credential("password authentication requires a password"))?;
    session
        .userauth_password(&request.username, password)
        .map_err(|error| {
            BackendError::credential(format!("ssh password authentication failed: {error}"))
        })
}

fn authenticate_with_private_key(
    session: &SshSession,
    request: &ConnectTerminalRequest,
) -> BackendResult<()> {
    let private_key_path = request
        .private_key_path
        .as_deref()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            BackendError::credential("key authentication requires a private key path")
        })?;
    session
        .userauth_pubkey_file(
            &request.username,
            None,
            expand_private_key_path(private_key_path).as_path(),
            request.passphrase.as_deref(),
        )
        .map_err(|error| {
            BackendError::credential(format!("ssh key authentication failed: {error}"))
        })
}

fn authenticate_with_agent(
    session: &SshSession,
    request: &ConnectTerminalRequest,
) -> BackendResult<()> {
    session.userauth_agent(&request.username).map_err(|error| {
        BackendError::credential(format!("ssh agent authentication failed: {error}"))
    })
}

fn expand_private_key_path(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = home_dir() {
            return home.join(rest);
        }
    }
    PathBuf::from(path)
}

fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("USERPROFILE").map(PathBuf::from))
}

fn read_available_output(state: &BackendState, session_id: &str) -> BackendResult<String> {
    let mut runtimes = state
        .terminal_runtimes
        .lock()
        .map_err(|_| BackendError::validation("terminal runtime state is unavailable"))?;
    let runtime = runtimes
        .get_mut(session_id)
        .ok_or_else(|| BackendError::validation("terminal session was not found"))?;
    let _keep_session_alive = runtime.session.authenticated();
    let mut output = Vec::new();

    read_stream_to_buffer(&mut runtime.channel, &mut output, "terminal output")?;
    read_stream_to_buffer(
        &mut runtime.channel.stderr(),
        &mut output,
        "terminal stderr",
    )?;
    if runtime.channel.eof() {
        output.extend_from_slice(b"\r\n[remote shell closed]\r\n");
    }

    Ok(String::from_utf8_lossy(&output).into_owned())
}

fn read_stream_to_buffer<R: Read>(
    stream: &mut R,
    output: &mut Vec<u8>,
    label: &str,
) -> BackendResult<()> {
    let mut buffer = [0_u8; 4096];
    loop {
        match stream.read(&mut buffer) {
            Ok(0) => break,
            Ok(count) => output.extend_from_slice(&buffer[..count]),
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => break,
            Err(error) => {
                return Err(BackendError::validation(format!(
                    "failed to read {label}: {error}"
                )))
            }
        }
    }
    Ok(())
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
    Ok(())
}
