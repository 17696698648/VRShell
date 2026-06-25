use serde::Serialize;
use std::{error::Error, fmt};

pub(crate) type BackendResult<T> = Result<T, BackendError>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BackendError {
    pub code: String,
    pub message: String,
    pub recoverable: bool,
}

impl BackendError {
    #[allow(dead_code)]
    pub(crate) fn not_implemented(feature: impl Into<String>) -> Self {
        let feature = feature.into();
        Self {
            code: "notImplemented".to_string(),
            message: format!("{} is not implemented in the rebuilt backend yet", feature),
            recoverable: true,
        }
    }

    pub(crate) fn validation(message: impl Into<String>) -> Self {
        Self {
            code: "validationError".to_string(),
            message: scrub_sensitive_message(message.into()),
            recoverable: true,
        }
    }

    pub(crate) fn network(message: impl Into<String>, host: Option<String>) -> Self {
        let msg = message.into();
        Self {
            code: "networkError".to_string(),
            message: if let Some(h) = host {
                scrub_sensitive_message(format!("{} (host: {})", msg, h))
            } else {
                scrub_sensitive_message(msg)
            },
            recoverable: true,
        }
    }

    pub(crate) fn authentication(method: String, reason: String) -> Self {
        Self {
            code: "authenticationError".to_string(),
            message: scrub_sensitive_message(format!("auth method {}: {}", method, reason)),
            recoverable: true,
        }
    }

    pub(crate) fn storage(message: impl Into<String>) -> Self {
        Self {
            code: "storageError".to_string(),
            message: scrub_sensitive_message(message.into()),
            recoverable: true,
        }
    }

    pub(crate) fn credential(message: impl Into<String>) -> Self {
        Self {
            code: "credentialError".to_string(),
            message: scrub_sensitive_message(message.into()),
            recoverable: true,
        }
    }

    pub(crate) fn channel_error(session_id: String, kind: String) -> Self {
        Self {
            code: "channelError".to_string(),
            message: format!("session {}: {}", session_id, kind),
            recoverable: true,
        }
    }

    pub(crate) fn sftp_error(path: String, operation: String) -> Self {
        Self {
            code: "sftpError".to_string(),
            message: format!("{} on {}: operation failed", operation, path),
            recoverable: true,
        }
    }

    #[allow(dead_code)]
    pub(crate) fn host_key_rejected(message: impl Into<String>) -> Self {
        Self {
            code: "hostKeyRejected".to_string(),
            message: scrub_sensitive_message(message.into()),
            recoverable: true,
        }
    }

    pub(crate) fn host_key_changed(message: impl Into<String>) -> Self {
        Self {
            code: "hostKeyChanged".to_string(),
            message: scrub_sensitive_message(message.into()),
            recoverable: false,
        }
    }

    pub(crate) fn host_key_unknown(message: impl Into<String>) -> Self {
        Self {
            code: "hostKeyUnknown".to_string(),
            message: scrub_sensitive_message(message.into()),
            recoverable: true,
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
}
