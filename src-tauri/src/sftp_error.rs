pub(crate) type SftpError = crate::app_error::AppError;
pub(crate) type SftpResult<T> = crate::app_error::AppResult<T>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sftp_error_from_string() {
        let err = SftpError::from_message("sftp_error", "auth failed");
        assert_eq!(err.code, "auth_failed");
        assert!(!err.recoverable);
    }

    #[test]
    fn sftp_error_from_canceled() {
        let err = SftpError::from_message("sftp_error", "task canceled by user");
        assert_eq!(err.code, "canceled");
        assert!(err.recoverable);
    }

    #[test]
    fn sftp_error_details_contains_path() {
        let err = SftpError::size_mismatch("/tmp/file.txt", 10, 8);
        assert_eq!(
            err.details.get("path").and_then(|value| value.as_str()),
            Some("/tmp/file.txt")
        );
    }
}
