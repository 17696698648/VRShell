//! SSH Authentication Infrastructure
//!
//! 统一的 SSH 认证逻辑，供 `ssh_client`（terminal）和 `sftp_service` 共享复用。
//! 避免认证代码在两处重复维护。

use crate::{
    domain::credential::CredentialRef,
    error::{BackendError, BackendResult},
    services::credential_service,
};
use ssh2::Session as SshSession;

/// 通用 SSH 认证参数
pub(crate) struct SshAuthParams {
    pub username: String,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    pub passphrase: Option<String>,
    pub auth_method: Option<String>,
    pub credential_ref: Option<CredentialRef>,
}

/// 执行 SSH 认证，根据 auth_method 选择认证方式
pub(crate) fn authenticate(session: &SshSession, params: &SshAuthParams) -> BackendResult<()> {
    let method = params.auth_method.as_deref().unwrap_or("agent");

    match method {
        "password" => authenticate_with_password(session, params)?,
        "key" => authenticate_with_private_key(session, params)?,
        "agent" => authenticate_with_agent(session, params)?,
        method => {
            return Err(BackendError::validation(format!(
                "unsupported ssh auth method: {method}"
            )))
        }
    }

    if session.authenticated() {
        Ok(())
    } else {
        Err(BackendError::credential("ssh authentication failed"))
    }
}

/// 根据请求参数自动推断认证方式并执行
pub(crate) fn authenticate_with_inferred_method(
    session: &SshSession,
    params: &SshAuthParams,
) -> BackendResult<()> {
    let method = params
        .auth_method
        .as_deref()
        .unwrap_or_else(|| infer_auth_method(params));

    match method {
        "password" => authenticate_with_password(session, params)?,
        "key" => authenticate_with_private_key(session, params)?,
        "agent" => authenticate_with_agent(session, params)?,
        method => {
            return Err(BackendError::validation(format!(
                "unsupported ssh auth method: {method}"
            )))
        }
    }

    if session.authenticated() {
        Ok(())
    } else {
        Err(BackendError::credential("ssh authentication failed"))
    }
}

/// 根据参数推断认证方式
fn infer_auth_method(params: &SshAuthParams) -> &'static str {
    if params
        .private_key_path
        .as_deref()
        .is_some_and(|value| !value.is_empty())
    {
        "key"
    } else if params
        .password
        .as_deref()
        .is_some_and(|value| !value.is_empty())
        || params.credential_ref.is_some()
    {
        "password"
    } else {
        "agent"
    }
}

fn authenticate_with_password(session: &SshSession, params: &SshAuthParams) -> BackendResult<()> {
    let stored_password = match &params.credential_ref {
        Some(credential_ref) => credential_service::get(credential_ref.clone())?,
        None => None,
    };

    let password = params
        .password
        .as_deref()
        .filter(|value| !value.is_empty())
        .or(stored_password.as_deref())
        .ok_or_else(|| BackendError::credential("password authentication requires a password"))?;

    session
        .userauth_password(&params.username, password)
        .map_err(|error| {
            BackendError::credential(format!("ssh password authentication failed: {error}"))
        })
}

fn authenticate_with_private_key(
    session: &SshSession,
    params: &SshAuthParams,
) -> BackendResult<()> {
    let private_key_path = params
        .private_key_path
        .as_deref()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            BackendError::credential("key authentication requires a private key path")
        })?;

    session
        .userauth_pubkey_file(
            &params.username,
            None,
            expand_private_key_path(private_key_path).as_path(),
            params.passphrase.as_deref(),
        )
        .map_err(|error| {
            BackendError::credential(format!("ssh key authentication failed: {error}"))
        })
}

fn authenticate_with_agent(session: &SshSession, params: &SshAuthParams) -> BackendResult<()> {
    session.userauth_agent(&params.username).map_err(|error| {
        BackendError::credential(format!("ssh agent authentication failed: {error}"))
    })
}

fn expand_private_key_path(path: &str) -> std::path::PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = home_dir() {
            return home.join(rest);
        }
    }
    std::path::PathBuf::from(path)
}

fn home_dir() -> Option<std::path::PathBuf> {
    std::env::var_os("HOME")
        .map(std::path::PathBuf::from)
        .or_else(|| std::env::var_os("USERPROFILE").map(std::path::PathBuf::from))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expand_private_key_path_handles_tilde() {
        let path = expand_private_key_path("~/.ssh/id_rsa");
        assert!(
            path.to_str().unwrap().contains(".ssh/id_rsa")
                || path.to_str().unwrap() == "~/.ssh/id_rsa"
        );
    }

    #[test]
    fn expand_private_key_path_preserves_absolute() {
        let path = expand_private_key_path("/etc/ssh/key");
        assert_eq!(path, std::path::PathBuf::from("/etc/ssh/key"));
    }

    #[test]
    fn infer_auth_method_prefers_key_when_path_present() {
        let params = SshAuthParams {
            username: "user".into(),
            password: Some("pass".into()),
            private_key_path: Some("/home/user/.ssh/id_rsa".into()),
            passphrase: None,
            auth_method: None,
            credential_ref: None,
        };
        assert_eq!(infer_auth_method(&params), "key");
    }

    #[test]
    fn infer_auth_method_uses_password_when_credential_ref_present() {
        let params = SshAuthParams {
            username: "user".into(),
            password: None,
            private_key_path: None,
            passphrase: None,
            auth_method: None,
            credential_ref: Some(CredentialRef::new("svc".to_string(), "key".to_string())),
        };
        assert_eq!(infer_auth_method(&params), "password");
    }

    #[test]
    fn infer_auth_method_defaults_to_agent() {
        let params = SshAuthParams {
            username: "user".into(),
            password: None,
            private_key_path: None,
            passphrase: None,
            auth_method: None,
            credential_ref: None,
        };
        assert_eq!(infer_auth_method(&params), "agent");
    }
}
