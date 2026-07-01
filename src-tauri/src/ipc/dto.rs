use crate::domain::credential::CredentialRef;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionTreeActionResult {
    pub action: String,
    pub target_type: String,
    pub target_id: String,
    pub message: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SshConnectionDto {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    pub passphrase: Option<String>,
    pub auth_method: Option<String>,
    /// Credential reference for keyring-based authentication
    pub credential_ref: Option<CredentialRef>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConnectSshRequest {
    #[serde(flatten)]
    pub connection: SshConnectionDto,
    pub auto_reconnect: Option<bool>,
    pub idle_timeout_secs: Option<u64>,
}

pub(crate) type SftpConnectionDto = SshConnectionDto;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpRenameRequest {
    pub connection: SftpConnectionDto,
    pub old_path: String,
    pub new_path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpDeleteRequest {
    pub connection: SftpConnectionDto,
    pub remote_path: String,
    pub is_directory: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpTransferOptionsDto {
    pub conflict: Option<SftpTransferConflictStrategyDto>,
    pub overwrite: Option<bool>,
    pub resume: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum SftpTransferConflictStrategyDto {
    Overwrite,
    Skip,
    Rename,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpTransferRequest {
    pub connection: SftpConnectionDto,
    pub remote_path: String,
    pub task_id: String,
    pub data_base64: Option<String>,
    pub local_path: Option<String>,
    pub options: Option<SftpTransferOptionsDto>,
}

#[cfg(test)]
mod tests {
    use super::{ConnectSshRequest, SshConnectionDto};
    use serde_json::json;

    #[test]
    fn connect_ssh_request_uses_camel_case() {
        let request = ConnectSshRequest {
            connection: SshConnectionDto {
                host: "example.com".to_string(),
                port: 22,
                username: "alice".to_string(),
                password: None,
                private_key_path: Some("~/.ssh/id_ed25519".to_string()),
                passphrase: None,
                auth_method: Some("key".to_string()),
                credential_ref: None,
            },
            auto_reconnect: Some(true),
            idle_timeout_secs: Some(60),
        };

        let value = serde_json::to_value(request).expect("serialize request");
        assert_eq!(value["host"], json!("example.com"));
        assert_eq!(value["privateKeyPath"], json!("~/.ssh/id_ed25519"));
        assert_eq!(value["authMethod"], json!("key"));
        assert_eq!(value["autoReconnect"], json!(true));
        assert_eq!(value["idleTimeoutSecs"], json!(60));
    }

    #[test]
    fn ssh_connection_dto_uses_camel_case() {
        let connection = SshConnectionDto {
            host: "example.com".to_string(),
            port: 22,
            username: "alice".to_string(),
            password: None,
            private_key_path: Some("~/.ssh/id_ed25519".to_string()),
            passphrase: None,
            auth_method: Some("key".to_string()),
            credential_ref: None,
        };

        let value = serde_json::to_value(connection).expect("serialize connection");
        assert_eq!(value["privateKeyPath"], json!("~/.ssh/id_ed25519"));
        assert_eq!(value["authMethod"], json!("key"));
    }
}
