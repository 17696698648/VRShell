use crate::domain::credential::CredentialRef;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionGroup {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub hosts: Vec<SessionHost>,
    #[serde(default)]
    pub children: Vec<SessionGroup>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionHost {
    pub id: Option<String>,
    pub name: String,
    pub user: String,
    pub address: String,
    pub port: u16,
    #[serde(default)]
    pub auth_method: String,
    #[serde(default)]
    pub remark: String,
    #[serde(default)]
    pub credential_ref: Option<CredentialRef>,
}

impl SessionGroup {
    pub(crate) fn empty_root() -> Self {
        Self {
            id: "all".to_string(),
            name: "All".to_string(),
            icon: "server".to_string(),
            hosts: Vec::new(),
            children: Vec::new(),
        }
    }
}
