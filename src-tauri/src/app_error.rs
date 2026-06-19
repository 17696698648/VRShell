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
        let code = classify_message(domain, &lower);
        let recoverable = is_recoverable_code(code);
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

fn classify_message<'a>(domain: &'a str, lower: &str) -> &'a str {
    if lower.contains("canceled") || lower.contains("cancelled") {
        "canceled"
    } else if lower.contains("host key") && lower.contains("mismatch") {
        "host_key_mismatch"
    } else if lower.contains("host key") && lower.contains("unknown") {
        "host_key_unknown"
    } else if lower.contains("host key") || lower.contains("known_hosts") {
        "host_key"
    } else if lower.contains("auth") && lower.contains("agent") {
        "auth_agent"
    } else if lower.contains("private key") || lower.contains("identity file") {
        "auth_key"
    } else if lower.contains("auth") {
        "auth_failed"
    } else if lower.contains("keyring") || lower.contains("credential") {
        "credential_store"
    } else if lower.contains("resolve") || lower.contains("dns") {
        "dns_resolve"
    } else if lower.contains("timeout") || lower.contains("timed out") {
        "tcp_connect"
    } else if lower.contains("handshake") || lower.contains("kex") {
        "handshake"
    } else if lower.contains("connect") || lower.contains("session") || lower.contains("broken pipe") {
        "connection"
    } else if lower.contains("permission") || lower.contains("denied") || lower.contains("access") {
        "permission_denied"
    } else if lower.contains("not found") || lower.contains("no such") || lower.contains("does not exist") {
        "not_found"
    } else if lower.contains("already exists") || lower.contains("file exists") {
        "already_exists"
    } else if lower.contains("parent traversal")
        || lower.contains("invalid local path")
        || lower.contains("invalid remote path")
        || lower.contains("dangerous")
        || lower.contains("refusing")
    {
        "invalid_path"
    } else if lower.contains("size mismatch") || lower.contains("transfer size") {
        "size_mismatch"
    } else if lower.contains("sftp")
        || lower.contains("readdir")
        || lower.contains("stat")
        || lower.contains("mkdir")
        || lower.contains("unlink")
        || lower.contains("rename")
    {
        "sftp_error"
    } else {
        domain
    }
}

fn is_recoverable_code(code: &str) -> bool {
    matches!(
        code,
        "canceled"
            | "connection"
            | "tcp_connect"
            | "dns_resolve"
            | "handshake"
            | "host_key_unknown"
            | "sftp_error"
            | "size_mismatch"
    )
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_host_key_mismatch() {
        let error = AppError::from_message("app_error", "host key mismatch for example.com");
        assert_eq!(error.code, "host_key_mismatch");
        assert!(!error.recoverable);
    }

    #[test]
    fn classifies_network_errors_as_recoverable() {
        let error = AppError::from_message("app_error", "connection timed out");
        assert_eq!(error.code, "tcp_connect");
        assert!(error.recoverable);
    }

    #[test]
    fn classifies_sftp_operation_errors() {
        let error = AppError::from_message("sftp_error", "readdir /var/log err: failure");
        assert_eq!(error.code, "sftp_error");
        assert!(error.recoverable);
    }

    #[test]
    fn classifies_invalid_paths_as_non_recoverable() {
        let error = AppError::from_message("sftp_error", "upload local path must not contain parent traversal");
        assert_eq!(error.code, "invalid_path");
        assert!(!error.recoverable);
    }

    #[test]
    fn classifies_permission_errors_as_non_recoverable() {
        let error = AppError::from_message("sftp_error", "permission denied");
        assert_eq!(error.code, "permission_denied");
        assert!(!error.recoverable);
    }
}
