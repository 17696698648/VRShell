#[allow(dead_code)]
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
    "sftp_create_file",
    "sftp_rename",
    "sftp_delete",
    "sftp_upload",
    "sftp_upload_directory",
    "sftp_download",
    "sftp_read_file",
    "list_sftp_tasks",
    "cancel_sftp_task",
    "list_background_tasks",
    "cancel_background_task",
    "keyring_store",
    "keyring_get",
    "keyring_delete",
    "accept_host_key",
    "reject_host_key",
    "known_hosts_path",
    "open_known_hosts",
];

#[cfg(test)]
mod tests {
    use super::COMMANDS;
    use std::collections::HashSet;

    fn frontend_command_names() -> Vec<String> {
        const GENERATED_FRONTEND_COMMANDS: &str = include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../frontend/src/shared/ipc/generated/backendCommands.ts"
        ));
        let start = GENERATED_FRONTEND_COMMANDS
            .find("export const backendCommandNames = [")
            .expect("backendCommandNames section must exist");
        let after_start = &GENERATED_FRONTEND_COMMANDS[start..];
        let end = after_start
            .find("] as const")
            .expect("backendCommandNames terminator must exist");
        let body = &after_start[..end];

        let mut names = Vec::new();
        for line in body.lines() {
            let trimmed = line.trim();
            if !trimmed.starts_with('"') {
                continue;
            }
            names.push(trimmed.trim_end_matches(',').trim_matches('"').to_string());
        }
        names
    }

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
            "accept_host_key",
            "reject_host_key",
            "known_hosts_path",
            "open_known_hosts",
        ] {
            assert!(COMMANDS.contains(&command));
        }
    }

    #[test]
    fn matches_frontend_command_contract() {
        let frontend_commands = frontend_command_names();
        let rust_commands = COMMANDS
            .iter()
            .map(|command| command.to_string())
            .collect::<Vec<_>>();

        assert_eq!(rust_commands, frontend_commands);
    }
}
