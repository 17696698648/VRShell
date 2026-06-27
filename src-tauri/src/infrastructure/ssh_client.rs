//! SSH Client Infrastructure
//!
//! 职责：
//! - 封装 SSH 连接建立、认证、Channel 操作
//! - 提供非阻塞 I/O 读写能力
//! - 与 terminal_service 分离，service 管生命周期，这里管 SSH 细节

use crate::{
    domain::terminal::ConnectTerminalRequest,
    error::{BackendError, BackendResult},
    infrastructure::{
        ssh_auth::{self, SshAuthParams},
        ssh_connection,
    },
};
use ssh2::{Channel, Session as SshSession};
use std::{
    io::{Read, Write},
    thread,
    time::Duration,
};

/// SSH 运行时，持有 SSH Session 和 Channel
pub(crate) struct SshRuntime {
    pub session: SshSession,
    pub channel: Channel,
}

/// Host key 信息，用于 host key 校验
pub(crate) struct HostKeyInfo {
    pub key_type: String,
    pub fingerprint: String,
    pub raw_key: Vec<u8>,
}

/// SSH 客户端适配器
pub(crate) struct SshClient;

impl SshClient {
    /// 阶段 1：TCP 连接 + SSH 握手，获取 host key 信息（不认证）
    pub fn connect_phase1(host: &str, port: u16) -> BackendResult<(SshSession, HostKeyInfo)> {
        tracing::info!(host, port, "initiating SSH phase 1: TCP + handshake");
        let session = ssh_connection::open_ssh_session(host, port)?;

        // 获取服务器 host key
        let (raw_key, key_type) = session
            .host_key()
            .ok_or_else(|| BackendError::validation("failed to retrieve server host key"))?;

        let fingerprint = Self::compute_host_key_fingerprint(raw_key);
        let key_type_str = Self::host_key_type_to_string(key_type);

        let info = HostKeyInfo {
            key_type: key_type_str,
            fingerprint,
            raw_key: raw_key.to_vec(),
        };

        tracing::info!(host, port, key_type = %info.key_type, fingerprint = %info.fingerprint, "SSH phase 1 complete: host key acquired");
        Ok((session, info))
    }

    /// 阶段 2：使用已有 session 完成认证并打开 shell channel
    pub fn connect_phase2(
        session: SshSession,
        request: &ConnectTerminalRequest,
    ) -> BackendResult<SshRuntime> {
        Self::authenticate(&session, request)?;
        let channel = Self::open_shell_channel(&session)?;
        session.set_blocking(false);
        Ok(SshRuntime { session, channel })
    }

    /// 计算 host key 的 SHA256 fingerprint
    fn compute_host_key_fingerprint(raw_key: &[u8]) -> String {
        use base64::{engine::general_purpose::STANDARD, Engine as _};
        use sha2::{Digest, Sha256};
        let hash = Sha256::digest(raw_key);
        format!("SHA256:{}", STANDARD.encode(hash))
    }

    /// 将 ssh2 HostKeyType 转换为字符串
    fn host_key_type_to_string(key_type: ssh2::HostKeyType) -> String {
        match key_type {
            ssh2::HostKeyType::Rsa => "ssh-rsa".to_string(),
            ssh2::HostKeyType::Ecdsa256 => "ecdsa-sha2-nistp256".to_string(),
            ssh2::HostKeyType::Ecdsa384 => "ecdsa-sha2-nistp384".to_string(),
            ssh2::HostKeyType::Ecdsa521 => "ecdsa-sha2-nistp521".to_string(),
            ssh2::HostKeyType::Ed25519 => "ssh-ed25519".to_string(),
            _ => "unknown".to_string(),
        }
    }

    /// 从 Channel 读取输出数据
    pub fn read_output(runtime: &mut SshRuntime) -> BackendResult<String> {
        // 保持 session 活跃
        let _keep_alive = runtime.session.authenticated();

        let mut output = Vec::new();
        Self::read_stream_to_buffer(&mut runtime.channel, &mut output, "terminal output")?;
        Self::read_stream_to_buffer(
            &mut runtime.channel.stderr(),
            &mut output,
            "terminal stderr",
        )?;

        if runtime.channel.eof() {
            output.extend_from_slice(b"\r\n[remote shell closed]\r\n");
        }

        Ok(String::from_utf8_lossy(&output).into_owned())
    }

    /// 向 Channel 写入输入数据（非阻塞）
    pub fn write_input(runtime: &mut SshRuntime, input: &[u8]) -> BackendResult<()> {
        let mut written = 0;
        let mut pending_attempts = 0;

        while written < input.len() {
            match runtime.channel.write(&input[written..]) {
                Ok(0) => {
                    pending_attempts += 1;
                    Self::wait_for_nonblocking_io(runtime, pending_attempts)?;
                }
                Ok(count) => {
                    written += count;
                    pending_attempts = 0;
                }
                Err(error) if Self::is_nonblocking_io_pending(&error) => {
                    pending_attempts += 1;
                    Self::wait_for_nonblocking_io(runtime, pending_attempts)?;
                }
                Err(error) => {
                    return Err(BackendError::terminal(format!(
                        "failed to write terminal input: {error}"
                    )))
                }
            }
        }

        runtime.channel.flush().map_err(|error| {
            BackendError::terminal(format!("failed to flush terminal input: {error}"))
        })
    }

    /// 调整 PTY 大小
    pub fn resize_pty(runtime: &mut SshRuntime, cols: u16, rows: u16) -> BackendResult<()> {
        runtime
            .channel
            .request_pty_size(cols as u32, rows as u32, None, None)
            .map_err(|error| BackendError::terminal(format!("failed to resize pty: {error}")))
    }

    /// 检查 Channel 是否已关闭
    pub fn is_channel_eof(runtime: &SshRuntime) -> bool {
        runtime.channel.eof()
    }

    /// 关闭 Channel
    pub fn close_channel(runtime: &mut SshRuntime) {
        let _ = runtime.channel.close();
        let _ = runtime.channel.wait_close();
    }

    /// 测试 SSH 连接是否可建立（TCP + handshake + auth），不打开 shell channel
    pub fn test_connection(request: &ConnectTerminalRequest) -> BackendResult<String> {
        let session = ssh_connection::open_ssh_session(&request.host, request.port)?;
        Self::authenticate(&session, request)?;
        Ok(format!(
            "SSH connection to {}:{} succeeded (authenticated as {})",
            request.host, request.port, request.username
        ))
    }

    /// 测量 TCP 连接延迟（毫秒），支持自定义超时
    pub fn measure_tcp_latency(
        host: &str,
        port: u16,
        timeout_ms: Option<u64>,
    ) -> BackendResult<u64> {
        use std::time::Instant;
        tracing::debug!(host, port, "measuring TCP latency");
        let timeout = timeout_ms.map(Duration::from_millis);
        let start = Instant::now();
        let _stream = ssh_connection::open_tcp_stream_with_timeout(
            host,
            port,
            timeout.unwrap_or(Duration::from_secs(12)),
        )?;
        let elapsed = start.elapsed();
        tracing::debug!(
            host,
            port,
            latency_ms = elapsed.as_millis() as u64,
            "TCP latency measured"
        );
        Ok(elapsed.as_millis() as u64)
    }

    // ==================== 内部方法 ====================

    fn authenticate(session: &SshSession, request: &ConnectTerminalRequest) -> BackendResult<()> {
        let params = SshAuthParams {
            username: request.username.clone(),
            password: request.password.clone(),
            private_key_path: request.private_key_path.clone(),
            passphrase: request.passphrase.clone(),
            auth_method: request.auth_method.clone(),
            credential_ref: request.credential_ref.clone(),
        };
        ssh_auth::authenticate(session, &params)
    }

    fn open_shell_channel(session: &SshSession) -> BackendResult<Channel> {
        let mut channel = session.channel_session().map_err(|error| {
            BackendError::network(format!("failed to open ssh channel: {error}"))
        })?;

        channel
            .request_pty("xterm-256color", None, Some((80, 24, 0, 0)))
            .map_err(|error| BackendError::network(format!("failed to request pty: {error}")))?;

        channel.shell().map_err(|error| {
            BackendError::network(format!("failed to start remote shell: {error}"))
        })?;

        Ok(channel)
    }

    fn read_stream_to_buffer<R: Read>(
        stream: &mut R,
        output: &mut Vec<u8>,
        label: &str,
    ) -> BackendResult<()> {
        let mut buffer = [0_u8; 4096];
        loop {
            match stream.read(&mut buffer) {
                Ok(0) => break,
                Ok(count) => output.extend_from_slice(&buffer[..count]),
                Err(error) if Self::is_nonblocking_io_pending(&error) => break,
                Err(error) => {
                    return Err(BackendError::network(format!(
                        "failed to read {label}: {error}"
                    )))
                }
            }
        }
        Ok(())
    }

    fn wait_for_nonblocking_io(
        runtime: &mut SshRuntime,
        pending_attempts: usize,
    ) -> BackendResult<()> {
        if pending_attempts > 50 {
            return Err(BackendError::network(
                "failed to write terminal input: ssh channel is not ready",
            ));
        }
        // 读取挂起的输出数据，避免阻塞
        let _ = Self::read_output(runtime)?;
        thread::sleep(Duration::from_millis(10));
        Ok(())
    }

    fn is_nonblocking_io_pending(error: &std::io::Error) -> bool {
        if error.kind() == std::io::ErrorKind::WouldBlock {
            return true;
        }
        let message = error.to_string().to_ascii_lowercase();
        message.contains("transport read")
            || message.contains("would block")
            || message.contains("again")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_nonblocking_io_pending_detects_would_block() {
        let error = std::io::Error::new(std::io::ErrorKind::WouldBlock, "would block");
        assert!(SshClient::is_nonblocking_io_pending(&error));
    }

    #[test]
    fn is_nonblocking_io_pending_detects_transport_read() {
        let error = std::io::Error::new(std::io::ErrorKind::Other, "transport read error");
        assert!(SshClient::is_nonblocking_io_pending(&error));
    }
}
