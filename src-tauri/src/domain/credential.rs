use serde::{Deserialize, Serialize};

#[allow(dead_code)]
pub(crate) const DEFAULT_CREDENTIAL_SERVICE: &str = "vrshell";

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CredentialRef {
    pub service: String,
    pub key: String,
}

impl CredentialRef {
    pub(crate) fn new(service: impl Into<String>, key: impl Into<String>) -> Self {
        Self {
            service: service.into(),
            key: key.into(),
        }
    }

    #[allow(dead_code)]
    pub(crate) fn session_password(session_id: &str) -> Self {
        Self::new(
            DEFAULT_CREDENTIAL_SERVICE,
            format!("session:{session_id}:password"),
        )
    }
}
