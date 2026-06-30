pub(crate) mod credential;
pub(crate) mod devtools;
pub(crate) mod security;
pub(crate) mod session;
pub(crate) mod sftp;
pub(crate) mod task;
pub(crate) mod terminal;

pub(crate) fn handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        devtools::open_devtools,
        session::load_session_tree,
        session::save_session_tree,
        session::session_tree_action,
        session::apply_session_tree_action,
        session::parse_ssh_config,
        terminal::connect_ssh,
        terminal::send_input,
        terminal::disconnect_session,
        terminal::resize_pty,
        terminal::poll_events,
        terminal::test_ssh_connection,
        terminal::tcp_latency,
        sftp::sftp_list,
        sftp::sftp_mkdir,
        sftp::sftp_create_file,
        sftp::sftp_rename,
        sftp::sftp_delete,
        sftp::sftp_upload,
        sftp::sftp_upload_directory,
        sftp::sftp_download,
        sftp::sftp_read_file,
        sftp::list_sftp_tasks,
        sftp::cancel_sftp_task,
        task::list_background_tasks,
        task::cancel_background_task,
        credential::keyring_store,
        credential::keyring_get,
        credential::keyring_delete,
        security::accept_host_key,
        security::reject_host_key,
        security::known_hosts_path,
        security::open_known_hosts,
    ]
}
