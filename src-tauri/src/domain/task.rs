use crate::domain::sftp::{SftpTaskSnapshot, SftpTaskStatus};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum BackgroundTaskStatus {
    Running,
    Done,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BackgroundTaskProgress {
    pub transferred_bytes: u64,
    pub total_bytes: Option<u64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BackgroundTaskSnapshot {
    pub task_id: String,
    pub kind: String,
    pub title: String,
    pub detail: String,
    pub status: BackgroundTaskStatus,
    pub progress: BackgroundTaskProgress,
    pub error: Option<String>,
    pub trace_id: Option<String>,
    pub updated_at_ms: u128,
    pub started_at_ms: Option<u128>,
}

impl From<SftpTaskStatus> for BackgroundTaskStatus {
    fn from(status: SftpTaskStatus) -> Self {
        match status {
            SftpTaskStatus::Running => Self::Running,
            SftpTaskStatus::Done => Self::Done,
            SftpTaskStatus::Failed => Self::Failed,
            SftpTaskStatus::Cancelled => Self::Cancelled,
        }
    }
}

impl From<SftpTaskSnapshot> for BackgroundTaskSnapshot {
    fn from(snapshot: SftpTaskSnapshot) -> Self {
        Self {
            task_id: snapshot.task_id,
            kind: format!("sftp.{}", snapshot.kind),
            title: snapshot.title,
            detail: snapshot.detail,
            status: snapshot.status.into(),
            progress: BackgroundTaskProgress {
                transferred_bytes: snapshot.transferred_bytes,
                total_bytes: snapshot.total_bytes,
            },
            error: snapshot.error,
            trace_id: snapshot.trace_id,
            updated_at_ms: snapshot.updated_at_ms,
            started_at_ms: snapshot.started_at_ms,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{BackgroundTaskSnapshot, BackgroundTaskStatus};
    use crate::domain::sftp::{SftpTaskSnapshot, SftpTaskStatus};

    #[test]
    fn converts_sftp_task_snapshot_to_background_task() {
        let background = BackgroundTaskSnapshot::from(SftpTaskSnapshot {
            task_id: "task".to_string(),
            kind: "download".to_string(),
            title: "Download file".to_string(),
            detail: "/srv/app.log".to_string(),
            status: SftpTaskStatus::Done,
            transferred_bytes: 100,
            total_bytes: Some(100),
            error: None,
            trace_id: Some("trace-task".to_string()),
            updated_at_ms: 42,
            started_at_ms: Some(1),
        });

        assert_eq!(background.task_id, "task");
        assert_eq!(background.kind, "sftp.download");
        assert_eq!(background.status, BackgroundTaskStatus::Done);
        assert_eq!(background.progress.transferred_bytes, 100);
        assert_eq!(background.progress.total_bytes, Some(100));
        assert_eq!(background.trace_id.as_deref(), Some("trace-task"));
    }
}
