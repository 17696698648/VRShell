use crate::domain::sftp::{SftpTaskSnapshot, SftpTaskStatus};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BackgroundTaskSnapshot {
    pub task_id: String,
    pub kind: String,
    pub title: String,
    pub detail: String,
    pub status: BackgroundTaskStatus,
    pub transferred_bytes: u64,
    pub total_bytes: Option<u64>,
    pub error: Option<String>,
    pub updated_at_ms: u128,
    pub started_at_ms: Option<u128>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum BackgroundTaskStatus {
    Running,
    Done,
    Failed,
    Cancelled,
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

impl From<BackgroundTaskStatus> for SftpTaskStatus {
    fn from(status: BackgroundTaskStatus) -> Self {
        match status {
            BackgroundTaskStatus::Running => Self::Running,
            BackgroundTaskStatus::Done => Self::Done,
            BackgroundTaskStatus::Failed => Self::Failed,
            BackgroundTaskStatus::Cancelled => Self::Cancelled,
        }
    }
}

impl From<SftpTaskSnapshot> for BackgroundTaskSnapshot {
    fn from(snapshot: SftpTaskSnapshot) -> Self {
        Self {
            task_id: snapshot.task_id,
            kind: snapshot.kind,
            title: snapshot.title,
            detail: snapshot.detail,
            status: snapshot.status.into(),
            transferred_bytes: snapshot.transferred_bytes,
            total_bytes: snapshot.total_bytes,
            error: snapshot.error,
            updated_at_ms: snapshot.updated_at_ms,
            started_at_ms: snapshot.started_at_ms,
        }
    }
}

impl From<BackgroundTaskSnapshot> for SftpTaskSnapshot {
    fn from(snapshot: BackgroundTaskSnapshot) -> Self {
        Self {
            task_id: snapshot.task_id,
            kind: snapshot.kind,
            title: snapshot.title,
            detail: snapshot.detail,
            status: snapshot.status.into(),
            transferred_bytes: snapshot.transferred_bytes,
            total_bytes: snapshot.total_bytes,
            error: snapshot.error,
            updated_at_ms: snapshot.updated_at_ms,
            started_at_ms: snapshot.started_at_ms,
        }
    }
}

