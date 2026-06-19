use std::time::Duration;

pub(crate) const SSH_CONNECT_TIMEOUT_SECS: u64 = 15;
pub(crate) const SSH_KEEPALIVE_INTERVAL_SECS: u64 = 30;
pub(crate) const SSH_MAX_KEEPALIVE_FAILURES: u32 = 3;
pub(crate) const SSH_AUTO_RECONNECT_RETRIES: u32 = 3;
pub(crate) const SSH_OUTPUT_FLUSH_INTERVAL_MS: u64 = 12;
pub(crate) const SSH_MAX_PENDING_OUTPUT_BYTES: usize = 64 * 1024;
pub(crate) const SSH_OUTPUT_QUEUE_MAX_BYTES: usize = 2 * 1024 * 1024;

pub(crate) const DEFAULT_SFTP_IDLE_TIMEOUT_SECS: u64 = 10 * 60;
pub(crate) const SFTP_COPY_BUFFER_SIZE: usize = 64 * 1024;
pub(crate) const SFTP_PROGRESS_EMIT_INTERVAL_MS: u64 = 100;
pub(crate) const SFTP_MAX_ACTIVE_TASKS: usize = 8;

pub(crate) fn ssh_connect_timeout() -> Duration {
    Duration::from_secs(SSH_CONNECT_TIMEOUT_SECS)
}

pub(crate) fn ssh_keepalive_interval() -> Duration {
    Duration::from_secs(SSH_KEEPALIVE_INTERVAL_SECS)
}

pub(crate) fn ssh_output_flush_interval() -> Duration {
    Duration::from_millis(SSH_OUTPUT_FLUSH_INTERVAL_MS)
}

pub(crate) fn sftp_progress_emit_interval() -> Duration {
    Duration::from_millis(SFTP_PROGRESS_EMIT_INTERVAL_MS)
}

pub(crate) fn normalize_sftp_idle_timeout_secs(seconds: u64) -> u64 {
    seconds.max(1)
}
