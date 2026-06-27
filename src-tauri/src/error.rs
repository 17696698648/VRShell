use serde::Serialize;
use std::{error::Error, fmt};

pub(crate) type BackendResult<T> = Result<T, BackendError>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BackendError {
    pub code: String,
    pub kind: String,
    pub message: String,
    pub recoverable: bool,
}

impl BackendError {
    pub(crate) fn validation(message: impl Into<String>) -> Self {
        Self::new("validationError", "validation", message, true)
    }

    pub(crate) fn network(message: impl Into<String>) -> Self {
        Self::new("networkError", "network", message, true)
    }

    pub(crate) fn authentication(message: impl Into<String>) -> Self {
        Self::new("authenticationError", "authentication", message, true)
    }

    pub(crate) fn sftp(message: impl Into<String>) -> Self {
        Self::new("sftpError", "sftp", message, true)
    }

    pub(crate) fn terminal(message: impl Into<String>) -> Self {
        Self::new("terminalError", "terminal", message, true)
    }

    pub(crate) fn cancelled(message: impl Into<String>) -> Self {
        Self::new("cancelled", "cancelled", message, true)
    }

    pub(crate) fn storage(message: impl Into<String>) -> Self {
        Self::new("storageError", "storage", message, true)
    }

    pub(crate) fn credential(message: impl Into<String>) -> Self {
        Self::new("credentialError", "credential", message, true)
    }

    pub(crate) fn host_key_changed(message: impl Into<String>) -> Self {
        Self::new("hostKeyChanged", "security", message, false)
    }

    pub(crate) fn host_key_unknown(message: impl Into<String>) -> Self {
        Self::new("hostKeyUnknown", "security", message, true)
    }

    fn new(
        code: impl Into<String>,
        kind: impl Into<String>,
        message: impl Into<String>,
        recoverable: bool,
    ) -> Self {
        Self {
            code: code.into(),
            kind: kind.into(),
            message: scrub_sensitive_message(message.into()),
            recoverable,
        }
    }
}

fn scrub_sensitive_message(message: String) -> String {
    message
        .split_whitespace()
        .map(|part| {
            let lower = part.to_ascii_lowercase();
            if lower.starts_with("password=")
                || lower.starts_with("passphrase=")
                || lower.starts_with("secret=")
                || lower.starts_with("token=")
            {
                "[redacted]".to_string()
            } else {
                part.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

impl fmt::Display for BackendError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}

impl Error for BackendError {}

#[cfg(test)]
mod tests {
    use super::BackendError;
    use serde_json::json;

    #[test]
    fn backend_error_serializes_as_camel_case_contract() {
        let value = serde_json::to_value(BackendError::validation("host is required"))
            .expect("serialize error");

        assert_eq!(
            value,
            json!({
                "code": "validationError",
                "kind": "validation",
                "message": "host is required",
                "recoverable": true
            })
        );
    }

    #[test]
    fn backend_error_scrubs_sensitive_values() {
        let error = BackendError::credential("failed password=secret token=abc".to_string());

        assert_eq!(error.message, "failed [redacted] [redacted]");
    }

    #[test]
    fn terminal_error_uses_terminal_code() {
        let error = BackendError::terminal("failed to resize pty");

        assert_eq!(error.code, "terminalError");
        assert!(error.recoverable);
    }
}
