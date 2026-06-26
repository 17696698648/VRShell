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
pub(crate) struct ConnectSshRequest {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    pub passphrase: Option<String>,
    pub auth_method: Option<String>,
    pub auto_reconnect: Option<bool>,
    pub idle_timeout_secs: Option<u64>,
    /// Credential reference for keyring-based authentication
    pub credential_ref: Option<CredentialRef>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpConnectionDto {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    pub passphrase: Option<String>,
    pub auth_method: Option<String>,
    pub credential_ref: Option<CredentialRef>,
}

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
pub(crate) struct SftpTransferRequest {
    pub connection: SftpConnectionDto,
    pub remote_path: String,
    pub task_id: String,
    pub data_base64: Option<String>,
    pub local_path: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::ConnectSshRequest;
    use serde_json::json;

    #[test]
    fn connect_ssh_request_uses_camel_case() {
        let request = ConnectSshRequest {
            host: "example.com".to_string(),
            port: 22,
            username: "alice".to_string(),
            password: None,
            private_key_path: Some("~/.ssh/id_ed25519".to_string()),
            passphrase: None,
            auth_method: Some("key".to_string()),
            auto_reconnect: Some(true),
            idle_timeout_secs: Some(60),
            credential_ref: None,
        };

        let value = serde_json::to_value(request).expect("serialize request");
        assert_eq!(value["privateKeyPath"], json!("~/.ssh/id_ed25519"));
        assert_eq!(value["authMethod"], json!("key"));
        assert_eq!(value["autoReconnect"], json!(true));
        assert_eq!(value["idleTimeoutSecs"], json!(60));
    }
}
