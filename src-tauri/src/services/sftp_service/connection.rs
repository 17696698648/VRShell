use crate::{
    domain::sftp::SftpConnectionRequest,
    error::{BackendError, BackendResult},
    infrastructure::{
        ssh_auth::{self, SshAuthParams},
        ssh_connection,
    },
};
use ssh2::Session as SshSession;

pub(super) fn open_ssh_session(request: &SftpConnectionRequest) -> BackendResult<SshSession> {
    let session = ssh_connection::open_ssh_session(&request.host, request.port)?;
    authenticate(&session, request)?;
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
        .map_err(|error| BackendError::authentication(error.message))
}

pub(super) fn open_sftp(session: &SshSession) -> BackendResult<ssh2::Sftp> {
    session
        .sftp()
        .map_err(|error| BackendError::sftp(format!("failed to open sftp: {error}")))
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
