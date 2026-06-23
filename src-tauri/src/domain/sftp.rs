use crate::{domain::credential::CredentialRef, ipc::dto::SftpConnectionDto};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpConnectionRequest {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    pub passphrase: Option<String>,
    pub auth_method: Option<String>,
    pub credential_ref: Option<CredentialRef>,
}

impl From<SftpConnectionDto> for SftpConnectionRequest {
    fn from(connection: SftpConnectionDto) -> Self {
        Self {
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password,
            private_key_path: connection.private_key_path,
            passphrase: connection.passphrase,
            auth_method: connection.auth_method,
            credential_ref: connection.credential_ref,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size_bytes: u64,
    pub modified: Option<u64>,
}
