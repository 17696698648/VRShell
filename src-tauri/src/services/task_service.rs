use crate::{
    domain::task::{BackgroundTaskSnapshot, BackgroundTaskStatus},
    error::BackendResult,
    services::sftp_service,
    state::BackendState,
};
use std::cmp::Reverse;
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) fn list_background_tasks(
    state: &BackendState,
) -> BackendResult<Vec<BackgroundTaskSnapshot>> {
    let mut tasks = state.tasks.lock().values().cloned().collect::<Vec<_>>();
    tasks.extend(
        sftp_service::list_sftp_tasks(state)?
            .into_iter()
            .map(BackgroundTaskSnapshot::from),
    );
    tasks.sort_by_key(|task| Reverse(task.updated_at_ms));
    Ok(tasks)
}

pub(crate) fn cancel_background_task(state: &BackendState, task_id: &str) -> BackendResult<()> {
    state.cancelled_tasks.lock().insert(task_id.to_string());
    if let Some(task) = state.tasks.lock().get_mut(task_id) {
        task.status = BackgroundTaskStatus::Cancelled;
        task.updated_at_ms = current_time_ms();
        return Ok(());
    }
    sftp_service::mark_sftp_task_cancelled(state, task_id)
}

pub(crate) fn record_diagnostic_task(
    state: &BackendState,
    kind: &str,
    title: &str,
    detail: &str,
    status: BackgroundTaskStatus,
    error: Option<String>,
) -> String {
    let started_at_ms = current_time_ms();
    let task_id = format!("diag:{}:{}", kind, started_at_ms);
    state.tasks.lock().insert(
        task_id.clone(),
        BackgroundTaskSnapshot {
            task_id: task_id.clone(),
            kind: format!("diagnostic.{kind}"),
            title: title.to_string(),
            detail: detail.to_string(),
            status,
            progress: crate::domain::task::BackgroundTaskProgress {
                transferred_bytes: 1,
                total_bytes: Some(1),
            },
            error,
            trace_id: Some(format!("diag:{kind}")),
            updated_at_ms: started_at_ms,
            started_at_ms: Some(started_at_ms),
        },
    );
    task_id
}

fn current_time_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::{cancel_background_task, list_background_tasks, record_diagnostic_task};
    use crate::{domain::task::BackgroundTaskStatus, services::sftp_service, state::BackendState};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn lists_sftp_tasks_as_background_tasks() {
        let state = BackendState::new(temp_dir());
        sftp_service::register_sftp_task(&state, "task", "upload", "Upload file", "/tmp/app.log")
            .expect("register sftp task");

        let tasks = list_background_tasks(&state).expect("list background tasks");

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].task_id, "task");
        assert_eq!(tasks[0].kind, "sftp.upload");
        assert_eq!(tasks[0].status, BackgroundTaskStatus::Running);
    }

    #[test]
    fn cancels_background_task_through_sftp_bridge() {
        let state = BackendState::new(temp_dir());
        sftp_service::register_sftp_task(
            &state,
            "task",
            "download",
            "Download file",
            "/tmp/app.log",
        )
        .expect("register sftp task");

        cancel_background_task(&state, "task").expect("cancel background task");

        assert!(state.cancelled_tasks.lock().contains("task"));
        let tasks = list_background_tasks(&state).expect("list background tasks");
        assert_eq!(tasks[0].status, BackgroundTaskStatus::Cancelled);
    }

    #[test]
    fn lists_non_sftp_background_tasks() {
        let state = BackendState::new(temp_dir());
        let task_id = record_diagnostic_task(
            &state,
            "tcp-latency",
            "Measure TCP latency",
            "example.com:22",
            BackgroundTaskStatus::Done,
            None,
        );

        let tasks = list_background_tasks(&state).expect("list background tasks");

        assert!(tasks.iter().any(|task| task.task_id == task_id));
        assert!(tasks
            .iter()
            .any(|task| task.kind == "diagnostic.tcp-latency"));
    }

    #[test]
    fn cancels_non_sftp_background_tasks() {
        let state = BackendState::new(temp_dir());
        let task_id = record_diagnostic_task(
            &state,
            "tcp-latency",
            "Measure TCP latency",
            "example.com:22",
            BackgroundTaskStatus::Running,
            None,
        );

        cancel_background_task(&state, &task_id).expect("cancel diagnostic task");

        let tasks = list_background_tasks(&state).expect("list background tasks");
        let task = tasks
            .into_iter()
            .find(|item| item.task_id == task_id)
            .expect("diagnostic task");
        assert_eq!(task.status, BackgroundTaskStatus::Cancelled);
    }

    fn temp_dir() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("vrshell-task-service-test-{unique}"))
    }
}
