pub(crate) const COMMANDS: &[&str] = &[
    "open_devtools",
    "load_session_tree",
    "save_session_tree",
    "session_tree_action",
    "apply_session_tree_action",
    "parse_ssh_config",
    "connect_ssh",
    "send_input",
    "disconnect_session",
    "resize_pty",
    "poll_events",
    "test_ssh_connection",
    "tcp_latency",
    "sftp_list",
    "sftp_mkdir",
    "sftp_rename",
    "sftp_delete",
    "sftp_upload",
    "sftp_download",
    "cancel_sftp_task",
    "keyring_store",
    "keyring_get",
    "keyring_delete",
];

#[cfg(test)]
mod tests {
    use super::COMMANDS;
    use std::collections::HashSet;

    #[test]
    fn command_names_are_unique() {
        let unique = COMMANDS.iter().collect::<HashSet<_>>();
        assert_eq!(unique.len(), COMMANDS.len());
    }

    #[test]
    fn keeps_legacy_frontend_entrypoints_during_rebuild() {
        for command in [
            "connect_ssh",
            "poll_events",
            "sftp_list",
            "load_session_tree",
        ] {
            assert!(COMMANDS.contains(&command));
        }
    }

    #[test]
    fn matches_frontend_command_contract() {
        let frontend_commands = [
            "open_devtools",
            "load_session_tree",
            "save_session_tree",
            "session_tree_action",
            "apply_session_tree_action",
            "parse_ssh_config",
            "connect_ssh",
            "send_input",
            "disconnect_session",
            "resize_pty",
            "poll_events",
            "test_ssh_connection",
            "tcp_latency",
            "sftp_list",
            "sftp_mkdir",
            "sftp_rename",
            "sftp_delete",
            "sftp_upload",
            "sftp_download",
            "cancel_sftp_task",
            "keyring_store",
            "keyring_get",
            "keyring_delete",
        ];

        assert_eq!(COMMANDS, frontend_commands);
    }
}
