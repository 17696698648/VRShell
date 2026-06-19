#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_error;
mod config;
mod connect;
mod host_key;
mod interaction;
mod keyring;
mod sanitize;
mod sessions;
mod sftp;
mod sftp_error;
mod sftp_path;
mod sftp_session;
mod sftp_task;
mod ssh;

use sessions::{AppState, HostKeyCache, SessionMap, SftpSessionMap, SftpTaskMap, SftpTaskQueueMap};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicU64},
        Arc, Mutex,
    },
};
use tauri::Manager;

macro_rules! app_invoke_handler {
    () => {
        tauri::generate_handler![
            // Session commands
            sessions::load_session_tree,
            sessions::save_session_tree,
            sessions::session_tree_action,
            sessions::parse_ssh_config,
            // SSH terminal commands
            ssh::connect_ssh,
            ssh::send_input,
            ssh::disconnect_session,
            ssh::resize_pty,
            ssh::poll_events,
            ssh::test_ssh_connection,
            ssh::tcp_latency,
            // SFTP commands
            sftp::sftp_list,
            sftp::sftp_list_page,
            sftp::sftp_upload,
            sftp::sftp_upload_many,
            sftp::sftp_upload_paths,
            sftp::sftp_download,
            sftp::sftp_download_to_path,
            sftp::sftp_mkdir,
            sftp::sftp_mkdir_p,
            sftp::sftp_rename,
            sftp::sftp_delete,
            sftp::sftp_delete_recursive,
            sftp::disconnect_sftp_session,
            sftp::set_sftp_idle_timeout,
            sftp::cancel_sftp_task,
            // Security and interaction commands
            host_key::get_host_key_fingerprint,
            host_key::get_pending_host_key_info,
            host_key::get_security_settings,
            host_key::accept_host_key,
            host_key::remove_known_host,
            host_key::get_hash_known_hosts,
            host_key::set_hash_known_hosts,
            host_key::get_known_hosts_path,
            host_key::set_known_hosts_path,
            interaction::respond_to_interaction,
            keyring::keyring_store,
            keyring::keyring_get,
            keyring::keyring_delete
        ]
    };
}

fn main() {
    let sessions: SessionMap = Arc::new(Mutex::new(HashMap::new()));
    let sftp_sessions: SftpSessionMap = Arc::new(Mutex::new(HashMap::new()));
    let sftp_tasks: SftpTaskMap = Arc::new(Mutex::new(HashMap::new()));
    let sftp_task_queues: SftpTaskQueueMap = Arc::new(Mutex::new(HashMap::new()));
    let sftp_idle_timeout_secs = Arc::new(AtomicU64::new(config::DEFAULT_SFTP_IDLE_TIMEOUT_SECS));
    let pending_host_keys: HostKeyCache = Arc::new(Mutex::new(Vec::new()));
    let hash_known_hosts = Arc::new(AtomicBool::new(false));
    let known_hosts_path_override: Arc<Mutex<Option<PathBuf>>> = Arc::new(Mutex::new(None));
    let pending_interactions = Arc::new(Mutex::new(HashMap::new()));
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            sessions,
            sftp_sessions,
            sftp_tasks,
            sftp_task_queues,
            sftp_idle_timeout_secs,
            pending_host_keys,
            hash_known_hosts,
            known_hosts_path_override,
            pending_interactions,
        })
        .invoke_handler(app_invoke_handler!())
        .setup(|app| {
            let private_known_hosts_path =
                host_key::init_app_private_known_hosts_path(app.handle())?;
            let state = app.state::<AppState>();
            let mut known_hosts_path = state
                .known_hosts_path_override
                .lock()
                .map_err(|e| format!("lock known_hosts path err: {}", e))?;
            if known_hosts_path.is_none() {
                *known_hosts_path = Some(private_known_hosts_path);
            }

            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!("tauri.conf.json"))
        .expect("error while running tauri application");
}
