use crate::{
    domain::credential::CredentialRef,
    infrastructure::known_hosts_store::KnownHostsStore,
    ipc::{dto::ConnectSshRequest, IpcResult},
    services::terminal_service,
    state::BackendState,
};
use tauri::State;

#[tauri::command]
pub fn accept_host_key(
    window: tauri::WebviewWindow,
    state: State<'_, BackendState>,
    pending_id: String,
    password: Option<String>,
    private_key_path: Option<String>,
    passphrase: Option<String>,
    auth_method: Option<String>,
    credential_ref: Option<CredentialRef>,
) -> IpcResult<String> {
    // Retrieve pending session info to build the request
    let (host, port, username) = {
        let pending = state.pending_host_key_sessions.lock();
        let session = pending.get(&pending_id).ok_or_else(|| {
            crate::error::BackendError::validation("pending host key session not found")
        })?;
        (session.host.clone(), session.port, session.username.clone())
    };

    let request = ConnectSshRequest {
        host,
        port,
        username,
        password,
        private_key_path,
        passphrase,
        auth_method,
        auto_reconnect: None,
        idle_timeout_secs: None,
        credential_ref,
    };

    terminal_service::accept_host_key(&window, &state, &pending_id, request.into())
        .map(|session| {
            terminal_service::start_output_reader(window, session.id.clone());
            session.id
        })
        .map_err(Into::into)
}

#[tauri::command]
pub fn reject_host_key(state: State<'_, BackendState>, pending_id: String) -> IpcResult<()> {
    terminal_service::reject_host_key(&state, &pending_id).map_err(Into::into)
}

#[tauri::command]
pub fn known_hosts_path() -> IpcResult<String> {
    Ok(KnownHostsStore::default_path().display().to_string())
}

#[tauri::command]
pub fn open_known_hosts() -> IpcResult<String> {
    let path = KnownHostsStore::default_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            crate::error::BackendError::storage(format!("failed to create .ssh directory: {error}"))
        })?;
    }
    if !path.exists() {
        std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .map_err(|error| {
                crate::error::BackendError::storage(format!(
                    "failed to create known_hosts: {error}"
                ))
            })?;
    }
    open_path_with_system(&path)?;
    Ok(path.display().to_string())
}

fn open_path_with_system(path: &std::path::Path) -> crate::error::BackendResult<()> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path.display().to_string()])
            .spawn()
            .map_err(|error| {
                crate::error::BackendError::storage(format!("failed to open known_hosts: {error}"))
            })?;
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|error| {
                crate::error::BackendError::storage(format!("failed to open known_hosts: {error}"))
            })?;
        return Ok(());
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|error| {
                crate::error::BackendError::storage(format!("failed to open known_hosts: {error}"))
            })?;
        return Ok(());
    }
    #[allow(unreachable_code)]
    Err(crate::error::BackendError::storage(
        "opening known_hosts is not supported on this platform",
    ))
}
