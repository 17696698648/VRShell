use crate::{
    domain::sftp::{SftpConnectionKey, SftpTaskSnapshot},
    domain::task::BackgroundTaskSnapshot,
    domain::terminal::{TerminalOutputEvent, TerminalSession},
    infrastructure::{app_paths::AppPaths, file_store::FileStore},
    services::{sftp_service::SftpSessionRuntime, terminal_service::TerminalRuntime},
};
use parking_lot::Mutex;
#[cfg(test)]
use std::path::PathBuf;
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
    time::{Duration, SystemTime},
};

pub(crate) const PENDING_HOST_KEY_SESSION_TTL: Duration = Duration::from_secs(5 * 60);
pub(crate) const DISCONNECTED_TERMINAL_TTL: Duration = Duration::from_secs(10 * 60);

pub(crate) struct BackendState {
    pub paths: AppPaths,
    pub terminals: Mutex<HashMap<String, TerminalSession>>,
    pub terminal_runtimes: Mutex<HashMap<String, TerminalRuntime>>,
    pub terminal_events: Mutex<HashMap<String, Vec<TerminalOutputEvent>>>,
    pub cancelled_tasks: Mutex<HashSet<String>>,
    pub tasks: Mutex<HashMap<String, BackgroundTaskSnapshot>>,
    pub sftp_tasks: Mutex<HashMap<String, SftpTaskSnapshot>>,
    pub sftp_sessions: Mutex<HashMap<SftpConnectionKey, Arc<SftpSessionRuntime>>>,
    pub active_sftp_transfers: Mutex<SftpTransferCounters>,
    /// Pending SSH sessions waiting for host key acceptance
    /// Key: pending_id, Value: (host, port, username, ssh_session)
    pub pending_host_key_sessions: Mutex<HashMap<String, PendingHostKeySession>>,
    pub disconnected_terminal_sessions: Mutex<HashMap<String, SystemTime>>,
}

/// Holds a partial SSH session (handshake done, awaiting host key acceptance)
pub(crate) struct PendingHostKeySession {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub session: ssh2::Session,
    pub fingerprint: String,
    pub key_type: String,
    pub created_at: SystemTime,
    #[allow(dead_code)]
    pub raw_key: Vec<u8>,
}

impl PendingHostKeySession {
    pub(crate) fn is_expired(&self, now: SystemTime) -> bool {
        now.duration_since(self.created_at)
            .map(|age| age > PENDING_HOST_KEY_SESSION_TTL)
            .unwrap_or(true)
    }
}

pub(crate) fn prune_expired_pending_host_key_sessions(state: &BackendState) -> usize {
    let now = SystemTime::now();
    let mut pending = state.pending_host_key_sessions.lock();
    let before = pending.len();
    pending.retain(|_, session| !session.is_expired(now));
    before - pending.len()
}

pub(crate) fn mark_terminal_disconnected(state: &BackendState, session_id: &str) {
    state
        .disconnected_terminal_sessions
        .lock()
        .insert(session_id.to_string(), SystemTime::now());
}

pub(crate) fn prune_expired_disconnected_terminal_sessions(state: &BackendState) -> usize {
    let now = SystemTime::now();
    let mut disconnected = state.disconnected_terminal_sessions.lock();
    let before = disconnected.len();
    disconnected.retain(|_, disconnected_at| {
        now.duration_since(*disconnected_at)
            .map(|age| age <= DISCONNECTED_TERMINAL_TTL)
            .unwrap_or(false)
    });
    before - disconnected.len()
}

impl BackendState {
    #[cfg(test)]
    pub(crate) fn new(app_data_dir: PathBuf) -> Self {
        Self::with_paths(AppPaths::new(app_data_dir))
    }

    pub(crate) fn with_paths(paths: AppPaths) -> Self {
        let sftp_tasks = FileStore::from_paths(&paths)
            .load_sftp_tasks()
            .unwrap_or_default()
            .into_iter()
            .map(|task| (task.task_id.clone(), task))
            .collect();
        Self {
            paths,
            terminals: Mutex::new(HashMap::new()),
            terminal_runtimes: Mutex::new(HashMap::new()),
            terminal_events: Mutex::new(HashMap::new()),
            cancelled_tasks: Mutex::new(HashSet::new()),
            tasks: Mutex::new(HashMap::new()),
            sftp_tasks: Mutex::new(sftp_tasks),
            sftp_sessions: Mutex::new(HashMap::new()),
            active_sftp_transfers: Mutex::new(SftpTransferCounters::default()),
            pending_host_key_sessions: Mutex::new(HashMap::new()),
            disconnected_terminal_sessions: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Default)]
pub(crate) struct SftpTransferCounters {
    pub total: usize,
    pub by_connection: HashMap<SftpConnectionKey, usize>,
}

#[cfg(test)]
mod tests {
    use super::{
        prune_expired_disconnected_terminal_sessions, BackendState, DISCONNECTED_TERMINAL_TTL,
        PENDING_HOST_KEY_SESSION_TTL,
    };
    use crate::{
        domain::sftp::{SftpTaskSnapshot, SftpTaskStatus},
        infrastructure::file_store::FileStore,
    };
    use std::{
        fs,
        time::{Duration, SystemTime, UNIX_EPOCH},
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
                trace_id: Some("task:task".to_string()),
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

    #[test]
    fn pending_host_key_session_ttl_is_five_minutes() {
        assert_eq!(PENDING_HOST_KEY_SESSION_TTL, Duration::from_secs(300));
    }

    #[test]
    fn disconnected_terminal_ttl_is_ten_minutes() {
        assert_eq!(DISCONNECTED_TERMINAL_TTL, Duration::from_secs(600));
    }

    #[test]
    fn prunes_expired_disconnected_terminals() {
        let state = BackendState::new(temp_dir());
        let now = SystemTime::now();
        state.disconnected_terminal_sessions.lock().insert(
            "expired".to_string(),
            now - DISCONNECTED_TERMINAL_TTL - Duration::from_secs(1),
        );
        state
            .disconnected_terminal_sessions
            .lock()
            .insert("fresh".to_string(), now - Duration::from_secs(60));

        let pruned = prune_expired_disconnected_terminal_sessions(&state);

        assert_eq!(pruned, 1);
        let disconnected = state.disconnected_terminal_sessions.lock();
        assert!(disconnected.contains_key("fresh"));
        assert!(!disconnected.contains_key("expired"));
    }

    fn temp_dir() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("vrshell-state-test-{unique}"))
    }
}
