use crate::{
    domain::{session::SessionGroup, sftp::SftpTaskSnapshot},
    error::{BackendError, BackendResult},
    infrastructure::app_paths::AppPaths,
};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
};

const SESSION_TREE_FILE: &str = "session-tree.v1.json";
const SFTP_TASKS_FILE: &str = "sftp-tasks.v1.json";
const CURRENT_SESSION_TREE_VERSION: u32 = 1;
const CURRENT_SFTP_TASKS_VERSION: u32 = 1;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PersistedSessionTree {
    pub version: u32,
    pub groups: Vec<SessionGroup>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PersistedSftpTasks {
    pub version: u32,
    pub tasks: Vec<SftpTaskSnapshot>,
}

pub(crate) struct FileStore {
    app_data_dir: PathBuf,
}

impl FileStore {
    pub(crate) fn new(app_data_dir: PathBuf) -> Self {
        Self { app_data_dir }
    }

    pub(crate) fn from_paths(paths: &AppPaths) -> Self {
        Self::new(paths.app_data_dir())
    }

    pub(crate) fn load_session_tree(&self) -> BackendResult<Vec<SessionGroup>> {
        let path = self.session_tree_path();
        if !path.exists() {
            return Ok(default_session_tree());
        }

        let persisted: PersistedSessionTree = load_json_with_backup(&path, "session tree")?;

        migrate_session_tree(persisted)
    }

    pub(crate) fn save_session_tree(&self, groups: &[SessionGroup]) -> BackendResult<()> {
        self.ensure_app_data_dir()?;

        let persisted = PersistedSessionTree {
            version: CURRENT_SESSION_TREE_VERSION,
            groups: groups.to_vec(),
        };
        let content = serde_json::to_string_pretty(&persisted).map_err(|error| {
            BackendError::storage(format!("failed to serialize session tree: {error}"))
        })?;

        write_atomic_with_backup(
            &self.session_tree_path(),
            content.as_bytes(),
            "session tree",
        )
    }

    pub(crate) fn load_sftp_tasks(&self) -> BackendResult<Vec<SftpTaskSnapshot>> {
        let path = self.sftp_tasks_path();
        if !path.exists() {
            return Ok(Vec::new());
        }

        let persisted: PersistedSftpTasks = load_json_with_backup(&path, "sftp tasks")?;

        migrate_sftp_tasks(persisted)
    }

    pub(crate) fn save_sftp_tasks(&self, tasks: &[SftpTaskSnapshot]) -> BackendResult<()> {
        self.ensure_app_data_dir()?;

        let persisted = PersistedSftpTasks {
            version: CURRENT_SFTP_TASKS_VERSION,
            tasks: tasks.to_vec(),
        };
        let content = serde_json::to_string_pretty(&persisted).map_err(|error| {
            BackendError::storage(format!("failed to serialize sftp tasks: {error}"))
        })?;

        write_atomic_with_backup(&self.sftp_tasks_path(), content.as_bytes(), "sftp tasks")
    }

    fn ensure_app_data_dir(&self) -> BackendResult<()> {
        fs::create_dir_all(&self.app_data_dir).map_err(|error| {
            BackendError::storage(format!("failed to create app data dir: {error}"))
        })
    }

    fn session_tree_path(&self) -> PathBuf {
        self.app_data_dir.join(SESSION_TREE_FILE)
    }

    fn sftp_tasks_path(&self) -> PathBuf {
        self.app_data_dir.join(SFTP_TASKS_FILE)
    }
}

fn load_json_with_backup<T>(path: &Path, label: &str) -> BackendResult<T>
where
    T: for<'de> Deserialize<'de>,
{
    match read_json(path, label) {
        Ok(value) => Ok(value),
        Err(primary_error) => {
            let backup_path = backup_path(path);
            if !backup_path.exists() {
                return Err(primary_error);
            }

            read_json(&backup_path, label).map_err(|backup_error| {
                BackendError::storage(format!(
                    "failed to load {label}; backup also failed: {backup_error}"
                ))
            })
        }
    }
}

fn read_json<T>(path: &Path, label: &str) -> BackendResult<T>
where
    T: for<'de> Deserialize<'de>,
{
    let content = fs::read_to_string(path)
        .map_err(|error| BackendError::storage(format!("failed to read {label}: {error}")))?;
    serde_json::from_str(&content)
        .map_err(|error| BackendError::storage(format!("failed to parse {label}: {error}")))
}

fn write_atomic_with_backup(path: &Path, content: &[u8], label: &str) -> BackendResult<()> {
    let tmp_path = temp_path(path);
    let backup_path = backup_path(path);

    if path.exists() {
        fs::copy(path, &backup_path)
            .map_err(|error| BackendError::storage(format!("failed to backup {label}: {error}")))?;
    }

    {
        let mut file = File::create(&tmp_path).map_err(|error| {
            BackendError::storage(format!("failed to create temp {label}: {error}"))
        })?;
        file.write_all(content).map_err(|error| {
            BackendError::storage(format!("failed to write temp {label}: {error}"))
        })?;
        file.sync_all().map_err(|error| {
            BackendError::storage(format!("failed to sync temp {label}: {error}"))
        })?;
    }

    replace_with_temp_file(&tmp_path, path, label)?;

    Ok(())
}

fn replace_with_temp_file(tmp_path: &Path, path: &Path, label: &str) -> BackendResult<()> {
    match fs::rename(tmp_path, path) {
        Ok(()) => Ok(()),
        Err(first_error) if path.exists() => {
            fs::remove_file(path).map_err(|remove_error| {
                let _ = fs::remove_file(tmp_path);
                BackendError::storage(format!(
                    "failed to remove old {label}: {remove_error}; replace failed: {first_error}"
                ))
            })?;
            fs::rename(tmp_path, path).map_err(|rename_error| {
                let _ = fs::remove_file(tmp_path);
                BackendError::storage(format!("failed to replace {label}: {rename_error}"))
            })
        }
        Err(error) => {
            let _ = fs::remove_file(tmp_path);
            Err(BackendError::storage(format!(
                "failed to replace {label}: {error}"
            )))
        }
    }
}

fn temp_path(path: &Path) -> PathBuf {
    path.with_extension(format!(
        "{}.tmp",
        path.extension()
            .and_then(|extension| extension.to_str())
            .unwrap_or("json")
    ))
}

fn backup_path(path: &Path) -> PathBuf {
    path.with_extension(format!(
        "{}.bak",
        path.extension()
            .and_then(|extension| extension.to_str())
            .unwrap_or("json")
    ))
}

fn migrate_session_tree(persisted: PersistedSessionTree) -> BackendResult<Vec<SessionGroup>> {
    match persisted.version {
        CURRENT_SESSION_TREE_VERSION => Ok(normalize_session_tree(persisted.groups)),
        version => Err(BackendError::storage(format!(
            "unsupported session tree version: {version}"
        ))),
    }
}

fn migrate_sftp_tasks(persisted: PersistedSftpTasks) -> BackendResult<Vec<SftpTaskSnapshot>> {
    match persisted.version {
        CURRENT_SFTP_TASKS_VERSION => Ok(persisted.tasks),
        version => Err(BackendError::storage(format!(
            "unsupported sftp tasks version: {version}"
        ))),
    }
}

fn normalize_session_tree(groups: Vec<SessionGroup>) -> Vec<SessionGroup> {
    if groups.is_empty() {
        default_session_tree()
    } else {
        groups
    }
}

fn default_session_tree() -> Vec<SessionGroup> {
    vec![SessionGroup::empty_root()]
}

#[cfg(test)]
mod tests {
    use super::{
        migrate_session_tree, FileStore, PersistedSessionTree, CURRENT_SESSION_TREE_VERSION,
    };
    use crate::domain::{
        session::SessionGroup,
        sftp::{SftpTaskSnapshot, SftpTaskStatus},
    };
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn migration_returns_default_tree_for_empty_groups() {
        let groups = migrate_session_tree(PersistedSessionTree {
            version: CURRENT_SESSION_TREE_VERSION,
            groups: Vec::new(),
        })
        .expect("migrate session tree");

        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].id, "all");
    }

    #[test]
    fn migration_rejects_unknown_version() {
        let error = migrate_session_tree(PersistedSessionTree {
            version: 999,
            groups: vec![SessionGroup::empty_root()],
        })
        .expect_err("unknown version should fail");

        assert_eq!(error.code, "storageError");
    }

    #[test]
    fn file_store_round_trips_session_tree() {
        let dir = temp_dir();
        let store = FileStore::new(dir.clone());
        let groups = vec![SessionGroup {
            id: "custom".to_string(),
            name: "Custom".to_string(),
            icon: "folder".to_string(),
            hosts: Vec::new(),
            children: Vec::new(),
        }];

        store.save_session_tree(&groups).expect("save tree");
        let loaded = store.load_session_tree().expect("load tree");

        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].id, "custom");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn file_store_round_trips_sftp_tasks() {
        let dir = temp_dir();
        let store = FileStore::new(dir.clone());
        let tasks = vec![SftpTaskSnapshot {
            task_id: "task".to_string(),
            kind: "download".to_string(),
            title: "Download file".to_string(),
            detail: "/srv/app.log".to_string(),
            status: SftpTaskStatus::Done,
            transferred_bytes: 100,
            total_bytes: Some(100),
            error: None,
            trace_id: Some("task:task".to_string()),
            updated_at_ms: 42,
            started_at_ms: Some(0),
        }];

        store.save_sftp_tasks(&tasks).expect("save tasks");
        let loaded = store.load_sftp_tasks().expect("load tasks");

        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].task_id, "task");
        assert_eq!(loaded[0].detail, "/srv/app.log");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn file_store_keeps_backup_when_overwriting_session_tree() {
        let dir = temp_dir();
        let store = FileStore::new(dir.clone());
        let first = vec![SessionGroup {
            id: "first".to_string(),
            name: "First".to_string(),
            icon: "folder".to_string(),
            hosts: Vec::new(),
            children: Vec::new(),
        }];
        let second = vec![SessionGroup {
            id: "second".to_string(),
            name: "Second".to_string(),
            icon: "folder".to_string(),
            hosts: Vec::new(),
            children: Vec::new(),
        }];

        store.save_session_tree(&first).expect("save first tree");
        store.save_session_tree(&second).expect("save second tree");

        let backup = fs::read_to_string(dir.join("session-tree.v1.json.bak"))
            .expect("read session tree backup");
        assert!(backup.contains("first"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn file_store_recovers_session_tree_from_backup() {
        let dir = temp_dir();
        let store = FileStore::new(dir.clone());
        let first = vec![SessionGroup {
            id: "first".to_string(),
            name: "First".to_string(),
            icon: "folder".to_string(),
            hosts: Vec::new(),
            children: Vec::new(),
        }];
        let second = vec![SessionGroup {
            id: "second".to_string(),
            name: "Second".to_string(),
            icon: "folder".to_string(),
            hosts: Vec::new(),
            children: Vec::new(),
        }];

        store.save_session_tree(&first).expect("save first tree");
        store.save_session_tree(&second).expect("save second tree");
        fs::write(dir.join("session-tree.v1.json"), "not json").expect("corrupt tree");

        let loaded = store
            .load_session_tree()
            .expect("load session tree from backup");
        assert_eq!(loaded[0].id, "first");
        let _ = fs::remove_dir_all(dir);
    }

    fn temp_dir() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("vrshell-file-store-test-{unique}"))
    }
}
