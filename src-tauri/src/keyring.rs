use ::keyring::Entry;

#[tauri::command]
pub async fn keyring_store(
    _app: tauri::AppHandle,
    service: String,
    username: String,
    password: String,
) -> Result<(), String> {
    let entry = Entry::new(&service, &username);
    entry
        .set_password(&password)
        .map_err(|e| format!("keyring set err: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn keyring_get(
    _app: tauri::AppHandle,
    service: String,
    username: String,
) -> Result<Option<String>, String> {
    let entry = Entry::new(&service, &username);
    match entry.get_password() {
        Ok(p) => Ok(Some(p)),
        Err(_e) => Ok(None),
    }
}

#[tauri::command]
pub async fn keyring_delete(
    _app: tauri::AppHandle,
    service: String,
    username: String,
) -> Result<(), String> {
    let entry = Entry::new(&service, &username);
    entry
        .delete_password()
        .map_err(|e| format!("keyring delete err: {}", e))?;
    Ok(())
}
