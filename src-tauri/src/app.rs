use crate::{commands, state::BackendState};
use tauri::Manager;

pub(crate) fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
            app.manage(BackendState::new(app_data_dir));

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .invoke_handler(commands::handler())
        .run(tauri::generate_context!("tauri.conf.json"))
        .expect("failed to run VRShell backend");
}
