use crate::{
    domain::task::BackgroundTaskSnapshot, error::BackendResult, services::sftp_service,
    state::BackendState,
};

pub(crate) fn list_background_tasks(
    state: &BackendState,
) -> BackendResult<Vec<BackgroundTaskSnapshot>> {
    Ok(sftp_service::list_sftp_tasks(state)?
        .into_iter()
        .map(BackgroundTaskSnapshot::from)
        .collect())
}

pub(crate) fn cancel_background_task(state: &BackendState, task_id: &str) -> BackendResult<()> {
    state
        .cancelled_sftp_tasks
        .lock()
        .insert(task_id.to_string());
    sftp_service::mark_sftp_task_cancelled(state, task_id)
}

#[cfg(test)]
mod tests {
    use super::{cancel_background_task, list_background_tasks};
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

        assert!(state.cancelled_sftp_tasks.lock().contains("task"));
        let tasks = list_background_tasks(&state).expect("list background tasks");
        assert_eq!(tasks[0].status, BackgroundTaskStatus::Cancelled);
    }

    fn temp_dir() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("vrshell-task-service-test-{unique}"))
    }
}
