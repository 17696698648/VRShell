use crate::{
    domain::sftp::SftpTaskSnapshot,
    domain::terminal::{TerminalOutputEvent, TerminalSession},
    infrastructure::file_store::FileStore,
    services::terminal_service::TerminalRuntime,
};
use parking_lot::Mutex;
use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
};

pub(crate) struct BackendState {
    pub app_data_dir: PathBuf,
    pub terminals: Mutex<HashMap<String, TerminalSession>>,
    pub terminal_runtimes: Mutex<HashMap<String, TerminalRuntime>>,
    pub terminal_events: Mutex<HashMap<String, Vec<TerminalOutputEvent>>>,
    pub cancelled_sftp_tasks: Mutex<HashSet<String>>,
    pub sftp_tasks: Mutex<HashMap<String, SftpTaskSnapshot>>,
    /// Pending SSH sessions waiting for host key acceptance
    /// Key: pending_id, Value: (host, port, username, ssh_session)
    pub pending_host_key_sessions: Mutex<HashMap<String, PendingHostKeySession>>,
}

/// Holds a partial SSH session (handshake done, awaiting host key acceptance)
pub(crate) struct PendingHostKeySession {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub session: ssh2::Session,
    pub fingerprint: String,
    pub key_type: String,
    #[allow(dead_code)]
    pub raw_key: Vec<u8>,
}

impl BackendState {
    pub(crate) fn new(app_data_dir: PathBuf) -> Self {
        let sftp_tasks = FileStore::new(app_data_dir.clone())
            .load_sftp_tasks()
            .unwrap_or_default()
            .into_iter()
            .map(|task| (task.task_id.clone(), task))
            .collect();
        Self {
            app_data_dir,
            terminals: Mutex::new(HashMap::new()),
            terminal_runtimes: Mutex::new(HashMap::new()),
            terminal_events: Mutex::new(HashMap::new()),
            cancelled_sftp_tasks: Mutex::new(HashSet::new()),
            sftp_tasks: Mutex::new(sftp_tasks),
            pending_host_key_sessions: Mutex::new(HashMap::new()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::BackendState;
    use crate::{
        domain::sftp::{SftpTaskSnapshot, SftpTaskStatus},
        infrastructure::file_store::FileStore,
    };
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn loads_persisted_sftp_tasks_on_startup() {
        let dir = temp_dir();
        let store = FileStore::new(dir.clone());
        store
            .save_sftp_tasks(&[SftpTaskSnapshot {
                task_id: "task".to_string(),
                kind: "download".to_string(),
                title: "Download file".to_string(),
                detail: "/srv/app.log".to_string(),
                status: SftpTaskStatus::Running,
                transferred_bytes: 50,
                total_bytes: Some(100),
                error: None,
                updated_at_ms: 42,
                started_at_ms: Some(0),
            }])
            .expect("save tasks");

        let state = BackendState::new(dir.clone());
        let tasks = state.sftp_tasks.lock();

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks.get("task").expect("task").detail, "/srv/app.log");
        let _ = fs::remove_dir_all(dir);
    }

    fn temp_dir() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("vrshell-state-test-{unique}"))
    }
}
