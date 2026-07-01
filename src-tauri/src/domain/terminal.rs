use crate::domain::credential::CredentialRef;
use crate::ipc::dto::ConnectSshRequest;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConnectTerminalRequest {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    pub passphrase: Option<String>,
    pub auth_method: Option<String>,
    #[allow(dead_code)]
    pub auto_reconnect: Option<bool>,
    #[allow(dead_code)]
    pub idle_timeout_secs: Option<u64>,
    /// Credential reference for keyring-based authentication
    pub credential_ref: Option<CredentialRef>,
}

impl From<ConnectSshRequest> for ConnectTerminalRequest {
    fn from(request: ConnectSshRequest) -> Self {
        let connection = request.connection;
        Self {
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password,
            private_key_path: connection.private_key_path,
            passphrase: connection.passphrase,
            auth_method: connection.auth_method,
            auto_reconnect: request.auto_reconnect,
            idle_timeout_secs: request.idle_timeout_secs,
            credential_ref: connection.credential_ref,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TerminalSession {
    pub id: String,
    pub host: String,
    pub username: String,
    pub status: TerminalStatus,
}

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum TerminalStatus {
    Connecting,
    Connected,
    Disconnected,
    Failed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub(crate) enum TerminalOutputEvent {
    Output { data_base64: String },
}

#[cfg(test)]
mod tests {
    use super::TerminalOutputEvent;
    use serde_json::json;

    #[test]
    fn terminal_output_event_uses_camel_case_payload_fields() {
        let value = serde_json::to_value(TerminalOutputEvent::Output {
            data_base64: "aGVsbG8=".to_string(),
        })
        .expect("serialize terminal output event");

        assert_eq!(value, json!({"type": "output", "dataBase64": "aGVsbG8="}));
    }
}
