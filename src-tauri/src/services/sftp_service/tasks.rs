use crate::{
    domain::sftp::{SftpTaskSnapshot, SftpTaskStatus},
    error::BackendResult,
    infrastructure::file_store::FileStore,
    state::BackendState,
};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_PERSISTED_SFTP_TASKS: usize = 100;
const COMPLETED_SFTP_TASK_RETENTION_MS: u128 = 7 * 24 * 60 * 60 * 1000;

pub(super) enum SftpTaskTransition {
    Start {
        kind: String,
        title: String,
        detail: String,
    },
    Progress {
        transferred_bytes: u64,
        total_bytes: Option<u64>,
    },
    Complete {
        transferred_bytes: u64,
        total_bytes: Option<u64>,
    },
    Fail {
        error: String,
    },
    Cancel,
}

pub(crate) fn list_sftp_tasks(state: &BackendState) -> BackendResult<Vec<SftpTaskSnapshot>> {
    let tasks = pruned_sftp_tasks(state, current_time_ms())?;
    replace_sftp_tasks(state, &tasks)?;
    FileStore::from_paths(&state.paths).save_sftp_tasks(&tasks)?;
    Ok(tasks)
}

pub(crate) fn register_sftp_task(
    state: &BackendState,
    task_id: &str,
    kind: &str,
    title: &str,
    detail: &str,
) -> BackendResult<()> {
    apply_sftp_task_transition(
        state,
        task_id,
        SftpTaskTransition::Start {
            kind: kind.to_string(),
            title: title.to_string(),
            detail: detail.to_string(),
        },
    )
}

pub(crate) fn mark_sftp_task_cancelled(state: &BackendState, task_id: &str) -> BackendResult<()> {
    apply_sftp_task_transition(state, task_id, SftpTaskTransition::Cancel)
}

fn persist_sftp_tasks(state: &BackendState) -> BackendResult<()> {
    let tasks = pruned_sftp_tasks(state, current_time_ms())?;
    replace_sftp_tasks(state, &tasks)?;
    FileStore::from_paths(&state.paths).save_sftp_tasks(&tasks)
}

pub(super) fn find_sftp_task(
    state: &BackendState,
    task_id: &str,
) -> BackendResult<Option<SftpTaskSnapshot>> {
    Ok(state.sftp_tasks.lock().get(task_id).cloned())
}

fn pruned_sftp_tasks(state: &BackendState, now_ms: u128) -> BackendResult<Vec<SftpTaskSnapshot>> {
    let tasks = state
        .sftp_tasks
        .lock()
        .values()
        .cloned()
        .collect::<Vec<_>>();
    Ok(prune_sftp_tasks(tasks, now_ms))
}

fn replace_sftp_tasks(state: &BackendState, tasks: &[SftpTaskSnapshot]) -> BackendResult<()> {
    let mut stored_tasks = state.sftp_tasks.lock();
    stored_tasks.clear();
    stored_tasks.extend(
        tasks
            .iter()
            .cloned()
            .map(|task| (task.task_id.clone(), task)),
    );
    Ok(())
}

fn prune_sftp_tasks(mut tasks: Vec<SftpTaskSnapshot>, now_ms: u128) -> Vec<SftpTaskSnapshot> {
    tasks.retain(|task| should_keep_sftp_task(task, now_ms));
    sort_sftp_tasks(&mut tasks);
    tasks.truncate(MAX_PERSISTED_SFTP_TASKS);
    tasks
}

fn should_keep_sftp_task(task: &SftpTaskSnapshot, now_ms: u128) -> bool {
    if task.status == SftpTaskStatus::Running {
        return true;
    }
    now_ms.saturating_sub(task.updated_at_ms) <= COMPLETED_SFTP_TASK_RETENTION_MS
}

fn sort_sftp_tasks(tasks: &mut [SftpTaskSnapshot]) {
    tasks.sort_by(|left, right| {
        right
            .updated_at_ms
            .cmp(&left.updated_at_ms)
            .then_with(|| right.task_id.cmp(&left.task_id))
    });
}

pub(super) fn current_time_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

pub(super) fn apply_sftp_task_transition(
    state: &BackendState,
    task_id: &str,
    transition: SftpTaskTransition,
) -> BackendResult<()> {
    let mut tasks = state.sftp_tasks.lock();
    let existing = tasks.get(task_id).cloned();
    let now_ms = current_time_ms();
    let next = match transition {
        SftpTaskTransition::Start {
            kind,
            title,
            detail,
        } => SftpTaskSnapshot {
            task_id: task_id.to_string(),
            kind,
            title,
            detail,
            status: SftpTaskStatus::Running,
            transferred_bytes: 0,
            total_bytes: None,
            error: None,
            trace_id: Some(task_trace_id(task_id)),
            updated_at_ms: now_ms,
            started_at_ms: Some(now_ms),
        },
        SftpTaskTransition::Progress {
            transferred_bytes,
            total_bytes,
        } => transition_existing_task(
            task_id,
            existing,
            SftpTaskStatus::Running,
            transferred_bytes,
            total_bytes,
            None,
            now_ms,
        ),
        SftpTaskTransition::Complete {
            transferred_bytes,
            total_bytes,
        } => transition_existing_task(
            task_id,
            existing,
            SftpTaskStatus::Done,
            transferred_bytes,
            total_bytes,
            None,
            now_ms,
        ),
        SftpTaskTransition::Fail { error } => {
            let transferred_bytes = existing.as_ref().map_or(0, |task| task.transferred_bytes);
            let total_bytes = existing.as_ref().and_then(|task| task.total_bytes);
            transition_existing_task(
                task_id,
                existing,
                SftpTaskStatus::Failed,
                transferred_bytes,
                total_bytes,
                Some(error),
                now_ms,
            )
        }
        SftpTaskTransition::Cancel => {
            let transferred_bytes = existing.as_ref().map_or(0, |task| task.transferred_bytes);
            let total_bytes = existing.as_ref().and_then(|task| task.total_bytes);
            transition_existing_task(
                task_id,
                existing,
                SftpTaskStatus::Cancelled,
                transferred_bytes,
                total_bytes,
                Some("sftp task was cancelled".to_string()),
                now_ms,
            )
        }
    };
    tracing::debug!(
        task_id,
        trace_id = ?next.trace_id,
        status = ?next.status,
        transferred_bytes = next.transferred_bytes,
        total_bytes = ?next.total_bytes,
        "SFTP task state updated"
    );
    tasks.insert(task_id.to_string(), next);
    drop(tasks);
    persist_sftp_tasks(state)
}

fn transition_existing_task(
    task_id: &str,
    existing: Option<SftpTaskSnapshot>,
    status: SftpTaskStatus,
    transferred_bytes: u64,
    total_bytes: Option<u64>,
    error: Option<String>,
    updated_at_ms: u128,
) -> SftpTaskSnapshot {
    SftpTaskSnapshot {
        task_id: task_id.to_string(),
        kind: existing
            .as_ref()
            .map_or_else(|| "sftp".to_string(), |task| task.kind.clone()),
        title: existing
            .as_ref()
            .map_or_else(|| "SFTP transfer".to_string(), |task| task.title.clone()),
        detail: existing
            .as_ref()
            .map_or_else(|| task_id.to_string(), |task| task.detail.clone()),
        status,
        transferred_bytes,
        total_bytes,
        error,
        trace_id: existing
            .as_ref()
            .and_then(|task| task.trace_id.clone())
            .or_else(|| Some(task_trace_id(task_id))),
        updated_at_ms,
        started_at_ms: existing.and_then(|task| task.started_at_ms),
    }
}

fn task_trace_id(task_id: &str) -> String {
    format!("task:{task_id}")
}

#[cfg(test)]
fn record_sftp_task(
    state: &BackendState,
    task_id: &str,
    status: SftpTaskStatus,
    transferred_bytes: u64,
    total_bytes: Option<u64>,
    error: Option<String>,
) -> BackendResult<()> {
    let transition = match status {
        SftpTaskStatus::Running => SftpTaskTransition::Progress {
            transferred_bytes,
            total_bytes,
        },
        SftpTaskStatus::Done => SftpTaskTransition::Complete {
            transferred_bytes,
            total_bytes,
        },
        SftpTaskStatus::Failed => SftpTaskTransition::Fail {
            error: error.unwrap_or_else(|| "sftp task failed".to_string()),
        },
        SftpTaskStatus::Cancelled => SftpTaskTransition::Cancel,
    };
    apply_sftp_task_transition(state, task_id, transition)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn records_and_lists_sftp_task_snapshots_by_recent_update() {
        let state = test_state();

        record_sftp_task(
            &state,
            "a-older",
            SftpTaskStatus::Running,
            10,
            Some(100),
            None,
        )
        .expect("record older task");
        record_sftp_task(
            &state,
            "z-newer",
            SftpTaskStatus::Done,
            100,
            Some(100),
            None,
        )
        .expect("record newer task");

        let tasks = list_sftp_tasks(&state).expect("list tasks");
        assert_eq!(tasks.len(), 2);
        assert_eq!(tasks[0].task_id, "z-newer");
        assert!(matches!(tasks[0].status, SftpTaskStatus::Done));
        assert_eq!(tasks[1].task_id, "a-older");
        assert!(matches!(tasks[1].status, SftpTaskStatus::Running));
    }

    #[test]
    fn task_snapshot_keeps_registered_metadata() {
        let state = test_state();
        register_sftp_task(&state, "task", "download", "Download file", "/srv/app.log")
            .expect("register task");

        record_sftp_task(&state, "task", SftpTaskStatus::Done, 100, Some(100), None)
            .expect("record done task");

        let task = list_sftp_tasks(&state).expect("list tasks").remove(0);
        assert_eq!(task.kind, "download");
        assert_eq!(task.title, "Download file");
        assert_eq!(task.detail, "/srv/app.log");
        assert!(matches!(task.status, SftpTaskStatus::Done));
    }

    #[test]
    fn failed_task_snapshot_records_error() {
        let state = test_state();

        record_sftp_task(
            &state,
            "failed-task",
            SftpTaskStatus::Failed,
            0,
            None,
            Some("network lost".to_string()),
        )
        .expect("record failed task");

        let task = list_sftp_tasks(&state).expect("list tasks").remove(0);
        assert_eq!(task.task_id, "failed-task");
        assert!(matches!(task.status, SftpTaskStatus::Failed));
        assert_eq!(task.error.as_deref(), Some("network lost"));
    }

    #[test]
    fn pruning_drops_expired_terminal_tasks_but_keeps_running_tasks() {
        let now_ms = 10 * COMPLETED_SFTP_TASK_RETENTION_MS;
        let old_ms = now_ms - COMPLETED_SFTP_TASK_RETENTION_MS - 1;
        let fresh_ms = now_ms - COMPLETED_SFTP_TASK_RETENTION_MS + 1;
        let tasks = prune_sftp_tasks(
            vec![
                task_snapshot("old-done", SftpTaskStatus::Done, old_ms),
                task_snapshot("old-running", SftpTaskStatus::Running, old_ms),
                task_snapshot("fresh-failed", SftpTaskStatus::Failed, fresh_ms),
            ],
            now_ms,
        );

        assert_eq!(tasks.len(), 2);
        assert!(tasks.iter().any(|task| task.task_id == "old-running"));
        assert!(tasks.iter().any(|task| task.task_id == "fresh-failed"));
        assert!(!tasks.iter().any(|task| task.task_id == "old-done"));
    }

    #[test]
    fn pruning_limits_total_task_count() {
        let tasks = prune_sftp_tasks(
            (0..150)
                .map(|index| {
                    task_snapshot(&format!("task-{index:03}"), SftpTaskStatus::Done, index)
                })
                .collect(),
            COMPLETED_SFTP_TASK_RETENTION_MS,
        );

        assert_eq!(tasks.len(), MAX_PERSISTED_SFTP_TASKS);
        assert_eq!(tasks[0].task_id, "task-149");
        assert_eq!(tasks[99].task_id, "task-050");
    }

    #[test]
    fn cancelled_task_snapshot_keeps_existing_progress() {
        let state = test_state();
        record_sftp_task(&state, "task", SftpTaskStatus::Running, 42, Some(100), None)
            .expect("record running task");

        mark_sftp_task_cancelled(&state, "task").expect("cancel task");

        let task = list_sftp_tasks(&state).expect("list tasks").remove(0);
        assert_eq!(task.task_id, "task");
        assert!(matches!(task.status, SftpTaskStatus::Cancelled));
        assert_eq!(task.transferred_bytes, 42);
        assert_eq!(task.total_bytes, Some(100));
        assert_eq!(task.error.as_deref(), Some("sftp task was cancelled"));
    }

    fn task_snapshot(
        task_id: &str,
        status: SftpTaskStatus,
        updated_at_ms: u128,
    ) -> SftpTaskSnapshot {
        SftpTaskSnapshot {
            task_id: task_id.to_string(),
            kind: "download".to_string(),
            title: "Download file".to_string(),
            detail: "/srv/app.log".to_string(),
            status,
            transferred_bytes: 0,
            total_bytes: None,
            error: None,
            trace_id: Some(task_trace_id(task_id)),
            updated_at_ms,
            started_at_ms: None,
        }
    }

    fn test_state() -> BackendState {
        BackendState::new(temp_dir())
    }

    fn temp_dir() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("vrshell-sftp-service-test-{unique}"))
    }
}
