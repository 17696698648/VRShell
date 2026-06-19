use serde::Serialize;
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AppError {
    pub(crate) code: String,
    pub(crate) message: String,
    pub(crate) recoverable: bool,
    #[serde(skip_serializing_if = "Map::is_empty")]
    pub(crate) details: Map<String, Value>,
}

pub(crate) type AppResult<T> = Result<T, AppError>;

impl AppError {
    pub(crate) fn new(
        code: impl Into<String>,
        message: impl Into<String>,
        recoverable: bool,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            recoverable,
            details: Map::new(),
        }
    }

    pub(crate) fn with_detail(mut self, key: impl Into<String>, value: impl Into<Value>) -> Self {
        self.details.insert(key.into(), value.into());
        self
    }

    pub(crate) fn from_message(domain: &'static str, message: impl Into<String>) -> Self {
        let message = message.into();
        let lower = message.to_lowercase();
        let code = if lower.contains("canceled") || lower.contains("cancelled") {
            "canceled"
        } else if lower.contains("auth") {
            "auth_failed"
        } else if lower.contains("host key") || lower.contains("known_hosts") {
            "host_key"
        } else if lower.contains("keyring") {
            "credential_store"
        } else if lower.contains("timeout")
            || lower.contains("connect")
            || lower.contains("session")
            || lower.contains("handshake")
        {
            "connection"
        } else if lower.contains("not found") || lower.contains("no such") {
            "not_found"
        } else if lower.contains("permission") || lower.contains("denied") {
            "permission_denied"
        } else {
            domain
        };
        let recoverable = matches!(code, "canceled" | "connection" | "host_key" | "sftp_error");
        Self::new(code, message, recoverable)
    }

    pub(crate) fn size_mismatch(path: &str, expected: u64, actual: u64) -> Self {
        Self::new(
            "size_mismatch",
            format!(
                "transfer size mismatch: expected {} bytes, got {} bytes",
                expected, actual
            ),
            true,
        )
        .with_detail("path", path.to_string())
        .with_detail("expected", expected)
        .with_detail("actual", actual)
    }
}

impl From<String> for AppError {
    fn from(message: String) -> Self {
        Self::from_message("app_error", message)
    }
}

impl From<&str> for AppError {
    fn from(message: &str) -> Self {
        message.to_string().into()
    }
}
