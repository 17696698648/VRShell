use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    collections::VecDeque,
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicU64},
        Arc, Mutex,
    },
    thread::JoinHandle,
    time::Instant,
};
use tauri::{Emitter, Manager};

// Re-export interaction types so other modules can import from sessions.
pub(crate) use crate::interaction::PendingInteractionMap;

const MAX_OUTPUT_QUEUE_SIZE: usize = 500;

pub(crate) enum ControlMessage {
    Input(Vec<u8>),
    Resize(u16, u16),
    Close,
}

pub(crate) type ControlSender = std::sync::mpsc::Sender<ControlMessage>;

// Each session stores the control channel sender, an output queue that the
// frontend can poll if event.listen is not permitted, the thread handle,
// and connection metadata for cleanup.
pub(crate) struct SessionHandle {
    pub(crate) sender: ControlSender,
    pub(crate) output: Arc<Mutex<VecDeque<String>>>,
    pub(crate) thread: Option<JoinHandle<()>>,
    pub(crate) host: String,
    pub(crate) port: u16,
    pub(crate) username: String,
}

/// Push a JSON event string into the output queue, dropping oldest entries if over capacity.
pub(crate) fn push_output_event(output: &Arc<Mutex<VecDeque<String>>>, event_json: String) {
    if let Ok(mut q) = output.lock() {
        while q.len() >= MAX_OUTPUT_QUEUE_SIZE {
            q.pop_front();
        }
        q.push_back(event_json);
    }
}

pub(crate) type SessionMap = Arc<Mutex<HashMap<String, SessionHandle>>>;
pub(crate) struct SftpSessionHandle {
    pub(crate) session: ssh2::Session,
    pub(crate) last_used: Instant,
}
pub(crate) type SftpSessionMap = Arc<Mutex<HashMap<String, Arc<Mutex<SftpSessionHandle>>>>>;
pub(crate) type SftpTaskMap = Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>;
pub(crate) type SftpTaskQueueMap = Arc<Mutex<HashMap<String, Arc<Mutex<()>>>>>;

/// A pending host key waiting for user acceptance.
#[derive(Clone)]
pub(crate) struct PendingHostKey {
    pub(crate) host: String,
    pub(crate) port: u16,
    pub(crate) fingerprint: String,
    pub(crate) key_type: String,
    pub(crate) key_base64: String,
}

pub(crate) type HostKeyCache = Arc<Mutex<Vec<PendingHostKey>>>;

pub(crate) struct AppState {
    pub(crate) sessions: SessionMap,
    pub(crate) sftp_sessions: SftpSessionMap,
    pub(crate) sftp_tasks: SftpTaskMap,
    pub(crate) sftp_task_queues: SftpTaskQueueMap,
    pub(crate) sftp_idle_timeout_secs: Arc<AtomicU64>,
    pub(crate) pending_host_keys: HostKeyCache,
    /// Whether to hash hostnames before writing to known_hosts (HashKnownHosts).
    pub(crate) hash_known_hosts: Arc<AtomicBool>,
    /// Optional override for the known_hosts file path (UserKnownHostsFile).
    pub(crate) known_hosts_path_override: Arc<Mutex<Option<PathBuf>>>,
    /// In-flight interactive requests: session_id 鈫?response sender.
    pub(crate) pending_interactions: PendingInteractionMap,
}

#[derive(Clone, Serialize)]
pub(crate) struct TerminalEvent {
    pub(crate) session_id: String,
    pub(crate) data_base64: String,
}

#[derive(Clone, Serialize)]
pub(crate) struct MenuActionResult {
    action: String,
    target_type: String,
    target_id: String,
    message: String,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PersistedSessionHost {
    name: String,
    user: String,
    address: String,
    port: u16,
    #[serde(alias = "auth_method")]
    auth_method: String,
    #[serde(default)]
    password: String,
    #[serde(default)]
    #[serde(alias = "passwordKeyringId")]
    password_keyring_id: Option<String>,
    remark: String,
    #[serde(default)]
    latency: String,
    #[serde(default)]
    status: String,
    #[serde(default)]
    active: bool,
    #[serde(default)]
    auto_reconnect: Option<bool>,
    #[serde(default)]
    idle_timeout_secs: Option<u64>,
    #[serde(default)]
    hash_known_hosts: Option<bool>,
    #[serde(default)]
    identity_file: Option<String>,
}

const KEYRING_SERVICE: &str = "vrshell-sessions";

#[derive(Clone, Deserialize, Serialize)]
pub(crate) struct PersistedSessionGroup {
    id: String,
    name: String,
    icon: String,
    hosts: Vec<PersistedSessionHost>,
    children: Vec<PersistedSessionGroup>,
}

fn session_tree_file_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("resolve app data dir err: {}", e))?;
    fs::create_dir_all(&app_data_dir).map_err(|e| format!("create app data dir err: {}", e))?;
    Ok(app_data_dir.join("session-tree.json"))
}

#[tauri::command]
pub async fn load_session_tree(
    app_handle: tauri::AppHandle,
) -> Result<Vec<PersistedSessionGroup>, String> {
    let path = session_tree_file_path(&app_handle)?;

    if !path.exists() {
        return Ok(vec![PersistedSessionGroup {
            id: "all".into(),
            name: "All".into(),
            icon: "*".into(),
            hosts: vec![],
            children: vec![],
        }]);
    }

    let content = fs::read_to_string(&path).map_err(|e| format!("read session tree err: {}", e))?;
    let mut groups: Vec<PersistedSessionGroup> =
        serde_json::from_str(&content).map_err(|e| format!("parse session tree err: {}", e))?;
    // Restore passwords from keyring (also handles migration of legacy plaintext passwords)
    restore_host_passwords_after_load(&mut groups);
    Ok(groups)
}

fn store_host_password(host: &PersistedSessionHost) -> Result<(), String> {
    if host.password.is_empty() {
        return Ok(());
    }
    let keyring_id = host.password_keyring_id.as_deref().unwrap_or(&host.name);
    let entry = ::keyring::Entry::new(KEYRING_SERVICE, keyring_id);
    entry
        .set_password(&host.password)
        .map_err(|e| format!("keyring set password err: {}", e))?;
    Ok(())
}

fn restore_host_password(host: &mut PersistedSessionHost) {
    if host.password_keyring_id.is_none() && host.password.is_empty() {
        return;
    }
    let keyring_id = host
        .password_keyring_id
        .clone()
        .unwrap_or_else(|| host.name.clone());
    let entry = ::keyring::Entry::new(KEYRING_SERVICE, &keyring_id);
    if let Ok(pw) = entry.get_password() {
        host.password = pw;
        host.password_keyring_id = Some(keyring_id.clone());
    } else if host.password_keyring_id.is_some() {
        migrate_legacy_host_password(host, &keyring_id);
    }
    // If keyring lookup fails, keep whatever is in the password field (could be
    // a legacy plaintext password that will be migrated on next save)
}

fn migrate_legacy_host_password(host: &mut PersistedSessionHost, keyring_id: &str) {
    if keyring_id == host.name {
        return;
    }

    let legacy_entry = ::keyring::Entry::new(KEYRING_SERVICE, &host.name);
    let Ok(password) = legacy_entry.get_password() else {
        return;
    };

    let new_entry = ::keyring::Entry::new(KEYRING_SERVICE, keyring_id);
    if new_entry.set_password(&password).is_ok() {
        host.password = password;
        let _ = legacy_entry.delete_password();
    }
}

fn strip_host_passwords_for_save(groups: &mut [PersistedSessionGroup]) {
    for group in groups.iter_mut() {
        for host in group.hosts.iter_mut() {
            if !host.password.is_empty() {
                // Ensure keyring ID is set (legacy records use host name as default)
                if host.password_keyring_id.is_none() {
                    host.password_keyring_id = Some(host.name.clone());
                }
                // Store in keyring before stripping
                let _ = store_host_password(host);
                host.password = String::new();
            }
        }
        strip_host_passwords_for_save(&mut group.children);
    }
}

fn write_session_tree_atomically(path: &std::path::Path, content: &str) -> Result<(), String> {
    let temp_path = path.with_extension("json.tmp");
    let backup_path = path.with_extension("json.bak");

    fs::write(&temp_path, content).map_err(|e| format!("write session tree temp err: {}", e))?;

    if path.exists() {
        let _ = fs::copy(path, &backup_path);
    }

    fs::rename(&temp_path, path).map_err(|e| {
        let _ = fs::remove_file(&temp_path);
        format!("replace session tree err: {}", e)
    })
}

fn restore_host_passwords_after_load(groups: &mut [PersistedSessionGroup]) {
    for group in groups.iter_mut() {
        for host in group.hosts.iter_mut() {
            // Migration: if password is present but no keyring ID, store it first
            if !host.password.is_empty() && host.password_keyring_id.is_none() {
                host.password_keyring_id = Some(host.name.clone());
                let _ = store_host_password(host);
            }
            restore_host_password(host);
        }
        restore_host_passwords_after_load(&mut group.children);
    }
}

#[tauri::command]
pub async fn save_session_tree(
    app_handle: tauri::AppHandle,
    mut groups: Vec<PersistedSessionGroup>,
) -> Result<(), String> {
    // Store passwords in keyring and strip from in-memory structs before serialization
    strip_host_passwords_for_save(&mut groups);
    let path = session_tree_file_path(&app_handle)?;
    let content = serde_json::to_string_pretty(&groups)
        .map_err(|e| format!("serialize session tree err: {}", e))?;
    write_session_tree_atomically(&path, &content)
}

#[tauri::command]
pub async fn session_tree_action(
    app_handle: tauri::AppHandle,
    target_type: String,
    target_id: String,
    action: String,
) -> Result<MenuActionResult, String> {
    let allowed = match target_type.as_str() {
        "group" => matches!(
            action.as_str(),
            "create_group" | "create_session" | "rename" | "delete"
        ),
        "session" => matches!(action.as_str(), "connect" | "edit" | "rename" | "delete"),
        _ => false,
    };

    if !allowed {
        return Err(format!(
            "unsupported action '{}' for target '{}'",
            action, target_type
        ));
    }

    let message = format!("{}:{} -> {}", target_type, target_id, action);
    let result = MenuActionResult {
        action,
        target_type,
        target_id,
        message,
    };

    let _ = app_handle.emit("session-tree-action", result.clone());
    Ok(result)
}

/// Parsed entry from ~/.ssh/config
#[derive(Clone, Serialize)]
pub(crate) struct SshConfigHost {
    pub(crate) host: String,
    pub(crate) hostname: String,
    pub(crate) user: String,
    pub(crate) port: u16,
    #[serde(default)]
    pub(crate) identity_file: Option<String>,
}

/// Expand `~` in a path to the user's home directory.
fn expand_tilde(path: &str) -> String {
    if let Some(rest) = path.strip_prefix("~/").or_else(|| path.strip_prefix("~\\")) {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_default();
        if !home.is_empty() {
            return format!(
                "{}/{}",
                home.trim_end_matches('/').trim_end_matches('\\'),
                rest
            );
        }
    }
    path.to_string()
}

/// Parse ~/.ssh/config and return a list of discovered hosts
#[tauri::command]
pub async fn parse_ssh_config() -> Result<Vec<SshConfigHost>, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();
    if home.is_empty() {
        return Ok(Vec::new());
    }
    let config_path = std::path::PathBuf::from(&home).join(".ssh").join("config");
    if !config_path.exists() {
        return Ok(Vec::new());
    }
    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("read ssh config err: {}", e))?;

    let mut hosts: Vec<SshConfigHost> = Vec::new();
    let mut current: Option<SshConfigHost> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        // Skip comments and empty lines
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let parts: Vec<&str> = trimmed.splitn(2, |c: char| c.is_whitespace()).collect();
        if parts.len() < 2 {
            continue;
        }
        let keyword = parts[0].to_lowercase();
        let value = parts[1].trim();

        match keyword.as_str() {
            "host" => {
                if let Some(host) = current.take() {
                    hosts.push(host);
                }
                // Exclude wildcard hosts
                let host_name = if value.contains('*') || value.contains('!') {
                    String::new()
                } else {
                    value.split(' ').next().unwrap_or(value).to_string()
                };
                if !host_name.is_empty() {
                    current = Some(SshConfigHost {
                        host: host_name,
                        hostname: String::new(),
                        user: String::new(),
                        port: 22,
                        identity_file: None,
                    });
                }
            }
            "hostname" => {
                if let Some(ref mut h) = current {
                    h.hostname = value.to_string();
                }
            }
            "user" => {
                if let Some(ref mut h) = current {
                    h.user = value.to_string();
                }
            }
            "port" => {
                if let Some(ref mut h) = current {
                    h.port = value.parse().unwrap_or(22);
                }
            }
            "identityfile" => {
                if let Some(ref mut h) = current {
                    // IdentityFile can have multiple values; take the first one.
                    if h.identity_file.is_none() {
                        let expanded = expand_tilde(value);
                        // If the value is a relative path, prepend ~/.ssh/
                        let full_path = if expanded == value
                            && !value.starts_with('/')
                            && !value.starts_with('~')
                        {
                            format!("{}/.ssh/{}", home.trim_end_matches('/'), value)
                        } else {
                            expanded
                        };
                        h.identity_file = Some(full_path);
                    }
                }
            }
            _ => {}
        }
    }
    if let Some(host) = current.take() {
        hosts.push(host);
    }

    // Filter out entries without hostname
    hosts.retain(|h| !h.hostname.is_empty());
    Ok(hosts)
}

/// Look up the `IdentityFile` for a given hostname in `~/.ssh/config`.
///
/// This is used by `connect_ssh_session` when no explicit key was given.
pub(crate) fn lookup_identity_file(host: &str) -> Option<String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()?;
    if home.is_empty() {
        return None;
    }
    let config_path = std::path::PathBuf::from(&home).join(".ssh").join("config");
    if !config_path.exists() {
        return None;
    }
    let content = fs::read_to_string(config_path).ok()?;
    lookup_identity_file_in_config(host, &content, &home)
}

fn lookup_identity_file_in_config(host: &str, content: &str, home: &str) -> Option<String> {
    let mut current_host: Option<String> = None;
    let mut identity_file: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let parts: Vec<&str> = trimmed.splitn(2, |c: char| c.is_whitespace()).collect();
        if parts.len() < 2 {
            continue;
        }
        let keyword = parts[0].to_lowercase();
        let value = parts[1].trim();

        match keyword.as_str() {
            "host" => {
                if let Some(ref h) = current_host {
                    if (h == host || h == "*") && identity_file.is_some() {
                        return identity_file;
                    }
                }
                let host_name = value.split(' ').next().unwrap_or(value).to_string();
                if host_name.contains('*') || host_name.contains('!') || host_name.contains('?') {
                    current_host = None;
                    identity_file = None;
                } else {
                    current_host = Some(host_name);
                    identity_file = None;
                }
            }
            "identityfile" if current_host.is_some() && identity_file.is_none() => {
                let expanded = expand_tilde(value);
                let full_path =
                    if expanded == value && !value.starts_with('/') && !value.starts_with('~') {
                        format!("{}/.ssh/{}", home.trim_end_matches('/'), value)
                    } else {
                        expanded
                    };
                identity_file = Some(full_path);
            }
            _ => {}
        }
    }

    if let Some(ref h) = current_host {
        if h == host && identity_file.is_some() {
            return identity_file;
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lookup_identity_file_in_config_expands_relative_path() {
        let config = r#"
Host prod
  HostName prod.example.com
  IdentityFile id_prod
"#;

        assert_eq!(
            lookup_identity_file_in_config("prod", config, "/home/alice"),
            Some("/home/alice/.ssh/id_prod".to_string())
        );
    }

    #[test]
    fn lookup_identity_file_in_config_uses_first_identity_file() {
        let config = r#"
Host prod
  IdentityFile id_first
  IdentityFile id_second
"#;

        assert_eq!(
            lookup_identity_file_in_config("prod", config, "/home/alice"),
            Some("/home/alice/.ssh/id_first".to_string())
        );
    }

    #[test]
    fn lookup_identity_file_in_config_ignores_non_matching_hosts() {
        let config = r#"
Host dev
  IdentityFile id_dev
Host prod
  IdentityFile id_prod
"#;

        assert_eq!(
            lookup_identity_file_in_config("prod", config, "/home/alice"),
            Some("/home/alice/.ssh/id_prod".to_string())
        );
    }
}
