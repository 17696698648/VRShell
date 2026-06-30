use crate::error::{BackendError, BackendResult};
use ssh2::{MethodType, Session as SshSession};
use std::{
    net::{SocketAddr, TcpStream, ToSocketAddrs},
    sync::mpsc,
    thread,
    time::Duration,
};

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
            if !should_retry_with_compatibility(&default_error) {
                return Err(default_error);
            }
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
    let address = resolve_first_address_with_timeout(host, port, timeout)?;

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

fn resolve_first_address_with_timeout(
    host: &str,
    port: u16,
    timeout: Duration,
) -> BackendResult<SocketAddr> {
    let host = host.to_string();
    let (sender, receiver) = mpsc::channel();

    thread::spawn(move || {
        let result = (host.as_str(), port)
            .to_socket_addrs()
            .map_err(|error| BackendError::network(format!("failed to resolve host: {error}")))
            .and_then(|mut addresses| {
                addresses
                    .next()
                    .ok_or_else(|| BackendError::network("host did not resolve to an address"))
            });
        let _ = sender.send(result);
    });

    match receiver.recv_timeout(timeout) {
        Ok(result) => result,
        Err(mpsc::RecvTimeoutError::Timeout) => Err(BackendError::network(format!(
            "host resolution timed out after {} seconds",
            timeout.as_secs()
        ))),
        Err(mpsc::RecvTimeoutError::Disconnected) => {
            Err(BackendError::network("host resolution failed unexpectedly"))
        }
    }
}

fn should_retry_with_compatibility(error: &BackendError) -> bool {
    if error.kind != "network" {
        return false;
    }

    let message = error.message.to_ascii_lowercase();
    message.contains("handshake")
        && !message.contains("timed out")
        && !message.contains("timeout")
        && !message.contains("failed to resolve")
        && !message.contains("failed to connect ssh socket")
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compatibility_retry_only_applies_to_handshake_errors() {
        assert!(should_retry_with_compatibility(&BackendError::network(
            "ssh handshake failed: no matching key exchange method found"
        )));

        assert!(!should_retry_with_compatibility(&BackendError::network(
            "failed to resolve host: failed lookup address information"
        )));
        assert!(!should_retry_with_compatibility(&BackendError::network(
            "failed to connect ssh socket: timed out"
        )));
        assert!(!should_retry_with_compatibility(&BackendError::validation(
            "ssh handshake failed before validation"
        )));
    }
}
