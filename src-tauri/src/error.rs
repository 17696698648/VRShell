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
            message: message.into(),
            recoverable: true,
        }
    }

    pub(crate) fn storage(message: impl Into<String>) -> Self {
        Self {
            code: "storageError".to_string(),
            message: message.into(),
            recoverable: true,
        }
    }

    pub(crate) fn credential(message: impl Into<String>) -> Self {
        Self {
            code: "credentialError".to_string(),
            message: message.into(),
            recoverable: true,
        }
    }
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
}
