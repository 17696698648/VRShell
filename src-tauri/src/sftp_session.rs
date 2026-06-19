use crate::connect;
use crate::sessions::AppState;
use crate::sftp_error::SftpResult;
use serde::Deserialize;
use std::{
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tauri::State;

const SFTP_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpConnectionArgs {
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
    passphrase: Option<String>,
}

impl SftpConnectionArgs {
    pub(crate) fn session_key(&self) -> String {
        sftp_session_key(&self.host, self.port, &self.username)
    }
}

pub(crate) fn sftp_session_key(host: &str, port: u16, username: &str) -> String {
    format!("{}@{}:{}", username, host, port)
}

fn connect_sftp(
    connection: &SftpConnectionArgs,
    host_key_cache: Option<&crate::sessions::HostKeyCache>,
    known_hosts_path_override: Option<&Mutex<Option<std::path::PathBuf>>>,
) -> Result<ssh2::Session, String> {
    connect::connect_ssh_session(connect::ConnectOptions {
        host: &connection.host,
        port: connection.port,
        auth: connect::AuthOptions {
            username: &connection.username,
            password: connection.password.as_deref(),
            private_key_path: connection.private_key_path.as_deref(),
            passphrase: connection.passphrase.as_deref(),
        },
        connect_timeout: Some(SFTP_CONNECT_TIMEOUT),
        verify_known_hosts: true,
        host_key_cache,
        known_hosts_path_override,
        interaction: connect::InteractionOptions::none(),
    })
    .map(|conn| conn.session)
    .map_err(|e| e.to_string())
}

fn is_sftp_session_healthy(session: &ssh2::Session) -> bool {
    session.sftp().is_ok()
}

pub(crate) fn remove_sftp_session_state(state: &State<'_, AppState>, session_key: &str) {
    if let Ok(mut sessions) = state.sftp_sessions.lock() {
        sessions.remove(session_key);
    }
    if let Ok(mut queues) = state.sftp_task_queues.lock() {
        queues.remove(session_key);
    }
}

pub(crate) fn with_sftp<T>(
    state: &State<'_, AppState>,
    connection: &SftpConnectionArgs,
    operation: impl FnOnce(&ssh2::Sftp) -> SftpResult<T>,
) -> SftpResult<T> {
    let key = connection.session_key();
    let now = Instant::now();
    let idle_timeout = Duration::from_secs(
        state
            .sftp_idle_timeout_secs
            .load(std::sync::atomic::Ordering::Relaxed)
            .max(1),
    );

    let handle = {
        let mut sessions = state
            .sftp_sessions
            .lock()
            .map_err(|e| format!("sftp session cache lock err: {}", e))?;
        let mut expired_keys = Vec::new();
        sessions.retain(|session_key, handle| {
            let keep = handle
                .lock()
                .map(|handle| now.duration_since(handle.last_used) < idle_timeout)
                .unwrap_or(false);
            if !keep {
                expired_keys.push(session_key.clone());
            }
            keep
        });
        if !expired_keys.is_empty() {
            if let Ok(mut queues) = state.sftp_task_queues.lock() {
                for expired_key in expired_keys {
                    queues.remove(&expired_key);
                }
            }
        }

        if let Some(handle) = sessions.get(&key) {
            handle.clone()
        } else {
            let handle = Arc::new(Mutex::new(crate::sessions::SftpSessionHandle {
                session: connect_sftp(
                    connection,
                    Some(&state.pending_host_keys),
                    Some(&state.known_hosts_path_override),
                )?,
                last_used: now,
            }));
            sessions.insert(key.clone(), handle.clone());
            handle
        }
    };

    let mut handle = handle
        .lock()
        .map_err(|e| format!("sftp session lock err: {}", e))?;

    if !is_sftp_session_healthy(&handle.session) {
        drop(handle);
        remove_sftp_session_state(state, &key);
        return with_sftp(state, connection, operation);
    }

    handle.last_used = now;
    let sftp = handle.session.sftp().map_err(|e| {
        drop(handle);
        remove_sftp_session_state(state, &key);
        format!("sftp init err: {}", e)
    })?;

    match operation(&sftp) {
        Ok(value) => Ok(value),
        Err(error) => {
            remove_sftp_session_state(state, &key);
            Err(error)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sftp_session_key_format() {
        let key = sftp_session_key("example.com", 22, "admin");
        assert_eq!(key, "admin@example.com:22");
    }

    #[test]
    fn sftp_connection_args_session_key() {
        let connection = SftpConnectionArgs {
            host: "example.com".to_string(),
            port: 2222,
            username: "admin".to_string(),
            password: None,
            private_key_path: None,
            passphrase: None,
        };
        assert_eq!(connection.session_key(), "admin@example.com:2222");
    }
}
