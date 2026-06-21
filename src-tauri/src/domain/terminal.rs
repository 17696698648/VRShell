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
    pub auto_reconnect: Option<bool>,
    pub idle_timeout_secs: Option<u64>,
}

impl From<ConnectSshRequest> for ConnectTerminalRequest {
    fn from(request: ConnectSshRequest) -> Self {
        Self {
            host: request.host,
            port: request.port,
            username: request.username,
            password: request.password,
            private_key_path: request.private_key_path,
            passphrase: request.passphrase,
            auto_reconnect: request.auto_reconnect,
            idle_timeout_secs: request.idle_timeout_secs,
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
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum TerminalStatus {
    Connecting,
    Connected,
    Disconnected,
    Failed,
}
