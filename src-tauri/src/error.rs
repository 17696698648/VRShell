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

pub(crate) fn scrub_sensitive_message(message: String) -> String {
    let message = scrub_pem_blocks(&message);
    let mut parts = Vec::new();
    let mut skip_parts = 0;

    for part in message.split_whitespace() {
        if skip_parts > 0 {
            skip_parts -= 1;
            continue;
        }

        let lower = part.to_ascii_lowercase();
        if lower == "authorization:" || lower == "authorization" {
            skip_parts = 2;
            parts.push(part.to_string());
            continue;
        }
        parts.push(scrub_sensitive_part(&scrub_local_user_paths(part)));
    }

    parts.join(" ")
}

fn scrub_sensitive_part(part: &str) -> String {
    const SENSITIVE_KEYS: &[&str] = &[
        "authorization",
        "password",
        "passphrase",
        "secret",
        "token",
        "access-token",
        "access_token",
        "refresh-token",
        "refresh_token",
        "private-key",
        "private_key",
        "privatekey",
        "privatekeypath",
        "private_key_path",
        "private-key-path",
    ];

    let mut scrubbed = part.to_string();
    let lower = part.to_ascii_lowercase();
    if lower == "bearer" || lower.starts_with("bearer ") {
        return "[redacted]".to_string();
    }

    if is_sensitive_assignment(&lower) {
        return "[redacted]".to_string();
    }

    for key in SENSITIVE_KEYS {
        for separator in ["=", ":"] {
            let pattern = format!("{key}{separator}");
            let mut search_from = 0;
            while let Some(offset) = scrubbed[search_from..].to_ascii_lowercase().find(&pattern) {
                let start = search_from + offset;
                let value_start = start + pattern.len();
                scrubbed = redact_value(&scrubbed, value_start);
                search_from = value_start + "[redacted]".len();
                if search_from >= scrubbed.len() {
                    break;
                }
            }
        }
    }

    scrubbed
}

fn is_sensitive_assignment(lower: &str) -> bool {
    [
        "password=",
        "password:",
        "passphrase=",
        "passphrase:",
        "secret=",
        "secret:",
        "token=",
        "token:",
        "access-token=",
        "access-token:",
        "access_token=",
        "access_token:",
        "refresh-token=",
        "refresh-token:",
        "refresh_token=",
        "refresh_token:",
        "private-key=",
        "private-key:",
        "private_key=",
        "private_key:",
        "privatekey=",
        "privatekey:",
        "privatekeypath=",
        "privatekeypath:",
        "private_key_path=",
        "private_key_path:",
        "private-key-path=",
        "private-key-path:",
    ]
    .iter()
    .any(|pattern| lower.starts_with(pattern))
}

fn scrub_local_user_paths(value: &str) -> String {
    let value = scrub_path_after_marker(value, "C:\\Users\\", '\\');
    let value = scrub_path_after_marker(&value, "/home/", '/');
    scrub_path_after_marker(&value, "/Users/", '/')
}

fn scrub_path_after_marker(value: &str, marker: &str, separator: char) -> String {
    let mut scrubbed = value.to_string();
    let mut search_from = 0;
    while let Some(offset) = scrubbed[search_from..].find(marker) {
        let user_start = search_from + offset + marker.len();
        let user_end = scrubbed[user_start..]
            .find(separator)
            .map(|path_offset| user_start + path_offset)
            .unwrap_or(scrubbed.len());
        if user_end > user_start {
            scrubbed.replace_range(user_start..user_end, "[redacted]");
        }
        search_from = user_start + "[redacted]".len();
        if search_from >= scrubbed.len() {
            break;
        }
    }
    scrubbed
}

fn scrub_pem_blocks(message: &str) -> String {
    let mut scrubbed = String::new();
    let mut rest = message;
    while let Some(begin_offset) = rest.find("-----BEGIN ") {
        let begin_start = begin_offset;
        let label_start = begin_start + "-----BEGIN ".len();
        let Some(label_end_offset) = rest[label_start..].find("-----") else {
            break;
        };
        let label_end = label_start + label_end_offset;
        let header_end = label_end + "-----".len();
        let label = &rest[label_start..label_end];
        let end_marker = format!("-----END {label}-----");
        let Some(end_offset) = rest[header_end..].find(&end_marker) else {
            break;
        };
        scrubbed.push_str(&rest[..header_end]);
        scrubbed.push_str("[redacted]");
        let end_start = header_end + end_offset;
        let end_end = end_start + end_marker.len();
        scrubbed.push_str(&rest[end_start..end_end]);
        rest = &rest[end_end..];
    }
    scrubbed.push_str(rest);
    scrubbed
}

fn redact_value(part: &str, value_start: usize) -> String {
    let value_end = part[value_start..]
        .find(['&', ',', ';'])
        .map(|offset| value_start + offset)
        .unwrap_or(part.len());

    format!("{}[redacted]{}", &part[..value_start], &part[value_end..])
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
    fn backend_error_scrubs_sensitive_query_values() {
        let error = BackendError::network(
            "request failed url=https://example.test?token=abc&host=srv&password=secret",
        );

        assert_eq!(
            error.message,
            "request failed url=https://example.test?token=[redacted]&host=srv&password=[redacted]"
        );
    }

    #[test]
    fn backend_error_scrubs_sensitive_header_values() {
        let error = BackendError::authentication("Authorization: Bearer abc refresh_token=xyz");

        assert_eq!(error.message, "Authorization: [redacted]");
    }

    #[test]
    fn backend_error_scrubs_paths_key_variants_and_pem_blocks() {
        let error = BackendError::credential(
            "privateKeyPath=C:\\Users\\alice\\.ssh\\id_rsa access-token:abc /home/deploy/.ssh/id_rsa -----BEGIN OPENSSH PRIVATE KEY-----\nsecret\n-----END OPENSSH PRIVATE KEY-----",
        );

        assert_eq!(
            error.message,
            "[redacted] [redacted] /home/[redacted]/.ssh/id_rsa -----BEGIN OPENSSH PRIVATE KEY-----[redacted]-----END OPENSSH PRIVATE KEY-----"
        );
    }

    #[test]
    fn terminal_error_uses_terminal_code() {
        let error = BackendError::terminal("failed to resize pty");

        assert_eq!(error.code, "terminalError");
        assert!(error.recoverable);
    }

    #[test]
    fn authentication_error_uses_stable_taxonomy() {
        let error = BackendError::authentication("ssh password authentication failed");

        assert_eq!(error.code, "authenticationError");
        assert_eq!(error.kind, "authentication");
        assert!(error.recoverable);
    }

    #[test]
    fn host_key_changed_is_non_recoverable_security_error() {
        let error = BackendError::host_key_changed("host key changed");

        assert_eq!(error.code, "hostKeyChanged");
        assert_eq!(error.kind, "security");
        assert!(!error.recoverable);
    }
}
