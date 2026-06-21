#![allow(dead_code)]

use serde::Serialize;

pub(crate) const TERMINAL_OUTPUT: &str = "terminal.output";
pub(crate) const TERMINAL_CLOSED: &str = "terminal.closed";
pub(crate) const TERMINAL_ERROR: &str = "terminal.error";
pub(crate) const SFTP_PROGRESS: &str = "sftp.progress";
pub(crate) const SFTP_COMPLETED: &str = "sftp.completed";
pub(crate) const SFTP_FAILED: &str = "sftp.failed";
pub(crate) const SECURITY_HOST_KEY_REQUESTED: &str = "security.hostKeyRequested";
pub(crate) const INTERACTION_PROMPT_REQUESTED: &str = "interaction.promptRequested";

pub(crate) const EVENTS: &[&str] = &[
    TERMINAL_OUTPUT,
    TERMINAL_CLOSED,
    TERMINAL_ERROR,
    SFTP_PROGRESS,
    SFTP_COMPLETED,
    SFTP_FAILED,
    SECURITY_HOST_KEY_REQUESTED,
    INTERACTION_PROMPT_REQUESTED,
];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TerminalOutputEvent {
    pub session_id: String,
    pub data_base64: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SftpProgressEvent {
    pub task_id: String,
    pub transferred_bytes: u64,
    pub total_bytes: Option<u64>,
    pub bytes_per_second: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::EVENTS;
    use std::collections::HashSet;

    #[test]
    fn event_names_are_unique() {
        let unique = EVENTS.iter().collect::<HashSet<_>>();
        assert_eq!(unique.len(), EVENTS.len());
    }
}
