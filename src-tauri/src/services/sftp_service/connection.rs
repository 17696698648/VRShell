use crate::{
    domain::sftp::SftpConnectionRequest,
    error::{BackendError, BackendResult},
    infrastructure::ssh_auth::{self, SshAuthParams},
};
use ssh2::{MethodType, Session as SshSession};
use std::{
    net::{TcpStream, ToSocketAddrs},
    time::Duration,
};

const SSH_CONNECT_TIMEOUT: Duration = Duration::from_secs(12);
const LEGACY_KEX_PREFS: &str = "curve25519-sha256,curve25519-sha256@libssh.org,ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group-exchange-sha256,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group14-sha256,diffie-hellman-group14-sha1,diffie-hellman-group1-sha1";
const LEGACY_HOSTKEY_PREFS: &str = "ssh-ed25519,ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521,rsa-sha2-512,rsa-sha2-256,ssh-rsa";

pub(super) fn open_ssh_session(request: &SftpConnectionRequest) -> BackendResult<SshSession> {
    let address = (request.host.as_str(), request.port)
        .to_socket_addrs()
        .map_err(|error| BackendError::validation(format!("failed to resolve host: {error}")))?
        .next()
        .ok_or_else(|| BackendError::validation("host did not resolve to an address"))?;
    let default_error = match connect_ssh_session(&address, false) {
        Ok(session) => {
            authenticate(&session, request)?;
            return Ok(session);
        }
        Err(error) => error,
    };

    let session = connect_ssh_session(&address, true).map_err(|fallback_error| {
        BackendError::validation(format!(
            "ssh handshake failed: {default_error}; compatibility fallback failed: {fallback_error}"
        ))
    })?;
    authenticate(&session, request)?;
    Ok(session)
}

fn connect_ssh_session(
    address: &std::net::SocketAddr,
    compatibility_mode: bool,
) -> Result<SshSession, String> {
    let stream = TcpStream::connect_timeout(address, SSH_CONNECT_TIMEOUT)
        .map_err(|error| format!("failed to connect ssh socket: {error}"))?;
    stream
        .set_read_timeout(Some(SSH_CONNECT_TIMEOUT))
        .map_err(|error| format!("failed to configure ssh socket: {error}"))?;
    stream
        .set_write_timeout(Some(SSH_CONNECT_TIMEOUT))
        .map_err(|error| format!("failed to configure ssh socket: {error}"))?;

    let mut session =
        SshSession::new().map_err(|error| format!("failed to create ssh session: {error}"))?;
    if compatibility_mode {
        let _ = session.method_pref(MethodType::Kex, LEGACY_KEX_PREFS);
        let _ = session.method_pref(MethodType::HostKey, LEGACY_HOSTKEY_PREFS);
    }
    session.set_tcp_stream(stream);
    session.handshake().map_err(|error| format!("{error}"))?;
    Ok(session)
}

fn authenticate(session: &SshSession, request: &SftpConnectionRequest) -> BackendResult<()> {
    let params = SshAuthParams {
        username: request.username.clone(),
        password: request.password.clone(),
        private_key_path: request.private_key_path.clone(),
        passphrase: request.passphrase.clone(),
        auth_method: request.auth_method.clone(),
        credential_ref: request.credential_ref.clone(),
    };
    ssh_auth::authenticate_with_inferred_method(session, &params)
}

pub(super) fn open_sftp(session: &SshSession) -> BackendResult<ssh2::Sftp> {
    session
        .sftp()
        .map_err(|error| BackendError::validation(format!("failed to open sftp: {error}")))
}

pub(super) fn validate_remote_path(
    connection: &SftpConnectionRequest,
    remote_path: String,
) -> BackendResult<String> {
    validate_connection(connection)?;
    let remote_path = remote_path.trim();
    if remote_path.is_empty() {
        return Err(BackendError::validation("remote path is required"));
    }
    if !remote_path.starts_with('/') {
        return Err(BackendError::validation("remote path must be absolute"));
    }
    Ok(remote_path.to_string())
}

pub(super) fn validate_connection(connection: &SftpConnectionRequest) -> BackendResult<()> {
    if connection.host.trim().is_empty() {
        return Err(BackendError::validation("host is required"));
    }
    if connection.username.trim().is_empty() {
        return Err(BackendError::validation("username is required"));
    }
    if connection.port == 0 {
        return Err(BackendError::validation("port must be greater than zero"));
    }
    Ok(())
}
