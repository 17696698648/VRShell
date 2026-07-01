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

impl SftpConnectionRequest {
    pub(crate) fn cache_key(&self) -> SftpConnectionKey {
        SftpConnectionKey {
            host: self.host.clone(),
            port: self.port,
            username: self.username.clone(),
            auth_method: self.auth_method.clone(),
            private_key_path: self.private_key_path.clone(),
            credential_ref: self
                .credential_ref
                .as_ref()
                .map(|credential| format!("{}:{}", credential.service, credential.key)),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub(crate) struct SftpConnectionKey {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: Option<String>,
    pub private_key_path: Option<String>,
    pub credential_ref: Option<String>,
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

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpTaskSnapshot {
    pub task_id: String,
    pub kind: String,
    pub title: String,
    pub detail: String,
    pub status: SftpTaskStatus,
    pub transferred_bytes: u64,
    pub total_bytes: Option<u64>,
    pub error: Option<String>,
    pub trace_id: Option<String>,
    pub updated_at_ms: u128,
    pub started_at_ms: Option<u128>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum SftpTaskStatus {
    Running,
    Done,
    Failed,
    Cancelled,
}
