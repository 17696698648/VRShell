use crate::{
    domain::sftp::{SftpConnectionRequest, SftpEntry},
    error::{BackendError, BackendResult},
};

pub(crate) fn list(
    connection: SftpConnectionRequest,
    path: String,
) -> BackendResult<Vec<SftpEntry>> {
    validate_connection(&connection)?;
    if path.trim().is_empty() {
        return Err(BackendError::validation("path is required"));
    }
    Err(BackendError::not_implemented("sftp list"))
}

pub(crate) fn mutate_file_system(feature: &str) -> BackendResult<()> {
    Err(BackendError::not_implemented(feature))
}

fn validate_connection(connection: &SftpConnectionRequest) -> BackendResult<()> {
    if connection.host.trim().is_empty() {
        return Err(BackendError::validation("host is required"));
    }
    if connection.username.trim().is_empty() {
        return Err(BackendError::validation("username is required"));
    }
    if connection.port == 0 {
        return Err(BackendError::validation("port must be greater than zero"));
    }

    let _auth_material = (
        &connection.password,
        &connection.private_key_path,
        &connection.passphrase,
    );
    Ok(())
}
