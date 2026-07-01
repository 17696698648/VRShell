use crate::{
    domain::task::BackgroundTaskSnapshot, ipc::IpcResult, services::task_service,
    state::BackendState,
};
use tauri::State;

#[tauri::command]
pub fn list_background_tasks(
    state: State<'_, BackendState>,
) -> IpcResult<Vec<BackgroundTaskSnapshot>> {
    task_service::list_background_tasks(&state).map_err(Into::into)
}

#[tauri::command]
pub fn cancel_background_task(state: State<'_, BackendState>, task_id: String) -> IpcResult<()> {
    task_service::cancel_background_task(&state, &task_id).map_err(Into::into)
}
