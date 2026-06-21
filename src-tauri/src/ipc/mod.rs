pub(crate) mod contract;
pub(crate) mod dto;
pub(crate) mod events;

use crate::error::BackendError;
use serde::Serialize;

pub(crate) type IpcResult<T> = Result<T, IpcError>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct IpcError {
    pub code: String,
    pub message: String,
    pub recoverable: bool,
}

impl From<BackendError> for IpcError {
    fn from(error: BackendError) -> Self {
        Self {
            code: error.code,
            message: error.message,
            recoverable: error.recoverable,
        }
    }
}
