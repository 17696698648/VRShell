use crate::{
    domain::session::SessionGroup,
    ipc::{dto::SessionTreeActionResult, IpcResult},
    services::session_service,
    state::BackendState,
};
use tauri::State;

#[tauri::command]
pub fn load_session_tree(state: State<'_, BackendState>) -> IpcResult<Vec<SessionGroup>> {
    session_service::load_session_tree(&state).map_err(Into::into)
}

#[tauri::command]
pub fn save_session_tree(
    state: State<'_, BackendState>,
    session_tree: Vec<SessionGroup>,
) -> IpcResult<()> {
    session_service::save_session_tree(&state, session_tree).map_err(Into::into)
}

#[tauri::command]
pub fn session_tree_action(
    state: State<'_, BackendState>,
    action: String,
    target_type: String,
    target_id: String,
) -> IpcResult<SessionTreeActionResult> {
    let message = session_service::session_tree_action(
        &state,
        action.clone(),
        target_type.clone(),
        target_id.clone(),
    )
    .map_err(crate::ipc::IpcError::from)?;

    Ok(SessionTreeActionResult {
        action,
        target_type,
        target_id,
        message,
    })
}

#[tauri::command]
pub fn apply_session_tree_action(
    state: State<'_, BackendState>,
    payload: crate::domain::session_tree::SessionTreeActionPayload,
) -> IpcResult<SessionTreeActionResult> {
    let action = payload.action.clone();
    let target_type = payload.target_type.clone();
    let target_id = payload.target_id.clone();
    let message = session_service::apply_session_tree_action_payload(&state, payload)
        .map_err(crate::ipc::IpcError::from)?;

    Ok(SessionTreeActionResult {
        action,
        target_type,
        target_id,
        message,
    })
}

#[tauri::command]
pub fn parse_ssh_config() -> IpcResult<Vec<crate::domain::ssh_config::SshConfigHost>> {
    session_service::import_ssh_config().map_err(Into::into)
}
