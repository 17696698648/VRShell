use crate::{domain::credential::CredentialRef, ipc::IpcResult, services::credential_service};

#[tauri::command]
pub fn keyring_store(service: String, key: String, value: String) -> IpcResult<()> {
    credential_service::store(CredentialRef::new(service, key), value).map_err(Into::into)
}

#[tauri::command]
pub fn keyring_get(service: String, key: String) -> IpcResult<Option<String>> {
    credential_service::get(CredentialRef::new(service, key)).map_err(Into::into)
}

#[tauri::command]
pub fn keyring_delete(service: String, key: String) -> IpcResult<()> {
    credential_service::delete(CredentialRef::new(service, key)).map_err(Into::into)
}
