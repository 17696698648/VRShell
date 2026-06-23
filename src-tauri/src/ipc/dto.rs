#![allow(dead_code)]

use crate::domain::{
    credential::CredentialRef, session::SessionGroup, sftp::SftpEntry, terminal::TerminalSession,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveSessionTreeRequest {
    pub session_tree: Vec<SessionGroup>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionTreeActionRequest {
    pub action: String,
    pub target_type: String,
    pub target_id: String,
}

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
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TerminalInputRequest {
    pub session_id: String,
    pub data_base64: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TerminalResizeRequest {
    pub session_id: Option<String>,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionIdRequest {
    pub session_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CredentialStoreRequest {
    pub credential_ref: CredentialRef,
    pub secret: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CredentialRefRequest {
    pub credential_ref: CredentialRef,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CredentialReadResponse {
    pub secret: Option<String>,
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
pub(crate) struct SftpPathRequest {
    pub connection: SftpConnectionDto,
    pub path: Option<String>,
    pub remote_path: Option<String>,
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
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpListResponse {
    pub entries: Vec<SftpEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConnectTerminalResponse {
    pub session: TerminalSession,
}

#[cfg(test)]
mod tests {
    use super::{ConnectSshRequest, CredentialStoreRequest};
    use crate::domain::credential::CredentialRef;
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
        };

        let value = serde_json::to_value(request).expect("serialize request");
        assert_eq!(value["privateKeyPath"], json!("~/.ssh/id_ed25519"));
        assert_eq!(value["authMethod"], json!("key"));
        assert_eq!(value["autoReconnect"], json!(true));
        assert_eq!(value["idleTimeoutSecs"], json!(60));
    }

    #[test]
    fn credential_store_request_uses_nested_credential_ref() {
        let request = CredentialStoreRequest {
            credential_ref: CredentialRef::new("vrshell", "session:abc:password"),
            secret: "secret".to_string(),
        };

        let value = serde_json::to_value(request).expect("serialize credential request");
        assert_eq!(value["credentialRef"]["service"], json!("vrshell"));
        assert_eq!(value["credentialRef"]["key"], json!("session:abc:password"));
    }
}
