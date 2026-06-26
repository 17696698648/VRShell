use crate::error::{BackendError, BackendResult};
use ssh2::{MethodType, Session as SshSession};
use std::{net::TcpStream, net::ToSocketAddrs, time::Duration};

const SSH_CONNECT_TIMEOUT: Duration = Duration::from_secs(12);
const LEGACY_KEX_PREFS: &str = "curve25519-sha256,curve25519-sha256@libssh.org,ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group-exchange-sha256,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group14-sha256,diffie-hellman-group14-sha1,diffie-hellman-group1-sha1";
const LEGACY_HOSTKEY_PREFS: &str = "ssh-ed25519,ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521,rsa-sha2-512,rsa-sha2-256,ssh-rsa";

pub(crate) fn open_ssh_session(host: &str, port: u16) -> BackendResult<SshSession> {
    open_ssh_session_with_timeout(host, port, SSH_CONNECT_TIMEOUT)
}

pub(crate) fn open_ssh_session_with_timeout(
    host: &str,
    port: u16,
    timeout: Duration,
) -> BackendResult<SshSession> {
    match connect_ssh_session(host, port, timeout, false) {
        Ok(session) => Ok(session),
        Err(default_error) => {
            connect_ssh_session(host, port, timeout, true).map_err(|fallback_error| {
                BackendError::network(format!(
                    "ssh handshake failed: {}; compatibility fallback failed: {}",
                    default_error.message, fallback_error.message
                ))
            })
        }
    }
}

pub(crate) fn open_tcp_stream_with_timeout(
    host: &str,
    port: u16,
    timeout: Duration,
) -> BackendResult<TcpStream> {
    let address = (host, port)
        .to_socket_addrs()
        .map_err(|error| BackendError::network(format!("failed to resolve host: {error}")))?
        .next()
        .ok_or_else(|| BackendError::network("host did not resolve to an address"))?;

    let stream = TcpStream::connect_timeout(&address, timeout)
        .map_err(|error| BackendError::network(format!("failed to connect ssh socket: {error}")))?;

    stream.set_read_timeout(Some(timeout)).map_err(|error| {
        BackendError::network(format!("failed to configure ssh socket: {error}"))
    })?;
    stream.set_write_timeout(Some(timeout)).map_err(|error| {
        BackendError::network(format!("failed to configure ssh socket: {error}"))
    })?;

    Ok(stream)
}

fn connect_ssh_session(
    host: &str,
    port: u16,
    timeout: Duration,
    compatibility_mode: bool,
) -> BackendResult<SshSession> {
    let stream = open_tcp_stream_with_timeout(host, port, timeout)?;
    let mut session = SshSession::new()
        .map_err(|error| BackendError::network(format!("failed to create ssh session: {error}")))?;
    if compatibility_mode {
        let _ = session.method_pref(MethodType::Kex, LEGACY_KEX_PREFS);
        let _ = session.method_pref(MethodType::HostKey, LEGACY_HOSTKEY_PREFS);
    }
    session.set_tcp_stream(stream);
    session
        .handshake()
        .map_err(|error| BackendError::network(format!("ssh handshake failed: {error}")))?;
    Ok(session)
}
