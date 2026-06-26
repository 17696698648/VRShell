//! Known Hosts Store
//!
//! 职责：
//! - 读写 ~/.ssh/known_hosts 文件
//! - 校验 SSH 服务器 host key fingerprint
//! - 添加/移除已接受的 host key 条目

use crate::error::{BackendError, BackendResult};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::PathBuf,
};

/// Host key 校验结果
pub(crate) enum HostKeyVerification {
    /// 已知且匹配
    Accepted,
    /// 已知但不匹配（可能被中间人攻击）
    Changed { expected_fingerprint: String },
    /// 未知 host key，需要用户确认
    Unknown {
        #[allow(dead_code)]
        fingerprint: String,
    },
}

/// Known hosts 存储路径
#[derive(Debug, Clone)]
pub(crate) struct KnownHostsStore {
    file_path: PathBuf,
}

impl KnownHostsStore {
    pub fn new(file_path: PathBuf) -> Self {
        Self { file_path }
    }

    pub fn default_path() -> PathBuf {
        let home = std::env::var_os("HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("USERPROFILE").map(PathBuf::from))
            .unwrap_or_else(|| PathBuf::from("."));
        home.join(".ssh").join("known_hosts")
    }

    /// 校验 host key fingerprint
    pub fn verify(
        &self,
        host: &str,
        port: u16,
        fingerprint: &str,
        key_type: &str,
    ) -> BackendResult<HostKeyVerification> {
        let entries = self.load_entries()?;
        let host_keys = self.host_key_patterns(host, port);

        let mut found_host = false;
        for entry in &entries {
            for pattern in &host_keys {
                if entry.matches_host(pattern) {
                    found_host = true;
                    if entry.key_type == key_type && entry.key_data == fingerprint {
                        return Ok(HostKeyVerification::Accepted);
                    }
                }
            }
        }

        if found_host {
            // 找到了该 host 的条目，但 fingerprint 不匹配
            let expected = entries
                .iter()
                .find(|entry| host_keys.iter().any(|pattern| entry.matches_host(pattern)))
                .map(|entry| entry.key_data.clone())
                .unwrap_or_default();
            Ok(HostKeyVerification::Changed {
                expected_fingerprint: expected,
            })
        } else {
            Ok(HostKeyVerification::Unknown {
                fingerprint: fingerprint.to_string(),
            })
        }
    }

    /// 添加已接受的 host key
    pub fn accept(
        &self,
        host: &str,
        port: u16,
        key_type: &str,
        fingerprint: &str,
    ) -> BackendResult<()> {
        // 使用 [host]:port 格式
        let host_pattern = format!("[{}]:{}", host, port);
        let line = format!("{} {} {}\n", host_pattern, key_type, fingerprint);

        if let Some(parent) = &self.file_path.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                BackendError::storage(format!("failed to create known_hosts directory: {error}"))
            })?;
        }

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.file_path)
            .map_err(|error| {
                BackendError::storage(format!("failed to open known_hosts: {error}"))
            })?;

        file.write_all(line.as_bytes()).map_err(|error| {
            BackendError::storage(format!("failed to write known_hosts: {error}"))
        })?;

        Ok(())
    }

    /// 计算 SSH host key 的 SHA256 fingerprint
    #[allow(dead_code)]
    pub fn compute_fingerprint(host_key: &[u8]) -> String {
        use base64::{engine::general_purpose::STANDARD, Engine as _};
        let hash = Sha256::digest(host_key);
        format!("SHA256:{}", STANDARD.encode(hash))
    }

    fn load_entries(&self) -> BackendResult<Vec<KnownHostEntry>> {
        if !self.file_path.exists() {
            return Ok(Vec::new());
        }

        let file = fs::File::open(&self.file_path).map_err(|error| {
            BackendError::storage(format!("failed to read known_hosts: {error}"))
        })?;

        let reader = BufReader::new(file);
        let mut entries = Vec::new();

        for line in reader.lines() {
            let line = match line {
                Ok(line) => line,
                Err(_) => continue,
            };
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            if let Some(entry) = KnownHostEntry::parse(trimmed) {
                entries.push(entry);
            }
        }

        Ok(entries)
    }

    fn host_key_patterns(&self, host: &str, port: u16) -> Vec<String> {
        vec![format!("[{}]:{}", host, port), host.to_string()]
    }
}

/// known_hosts 文件中的单条记录
#[derive(Debug, Clone)]
struct KnownHostEntry {
    host_pattern: String,
    key_type: String,
    key_data: String,
}

impl KnownHostEntry {
    fn parse(line: &str) -> Option<Self> {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            return None;
        }
        Some(Self {
            host_pattern: parts[0].to_string(),
            key_type: parts[1].to_string(),
            key_data: parts[2].to_string(),
        })
    }

    fn matches_host(&self, pattern: &str) -> bool {
        self.host_pattern == pattern
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn verify_returns_unknown_for_empty_file() {
        let dir = temp_dir();
        let store = KnownHostsStore::new(dir.join("known_hosts"));

        let result = store
            .verify("example.com", 22, "SHA256:abc123", "ssh-ed25519")
            .unwrap();
        assert!(matches!(result, HostKeyVerification::Unknown { .. }));

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn verify_returns_accepted_when_fingerprint_matches() {
        let dir = temp_dir();
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("known_hosts");
        fs::write(&path, "[example.com]:22 ssh-ed25519 SHA256:abc123\n").unwrap();
        let store = KnownHostsStore::new(path);

        let result = store
            .verify("example.com", 22, "SHA256:abc123", "ssh-ed25519")
            .unwrap();
        assert!(matches!(result, HostKeyVerification::Accepted));

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn verify_returns_changed_when_fingerprint_differs() {
        let dir = temp_dir();
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("known_hosts");
        fs::write(&path, "[example.com]:22 ssh-ed25519 SHA256:old_key\n").unwrap();
        let store = KnownHostsStore::new(path);

        let result = store
            .verify("example.com", 22, "SHA256:new_key", "ssh-ed25519")
            .unwrap();
        assert!(matches!(
            result,
            HostKeyVerification::Changed {
                expected_fingerprint
            } if expected_fingerprint == "SHA256:old_key"
        ));

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn verify_accepts_plain_host_entry_for_default_port() {
        let dir = temp_dir();
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("known_hosts");
        fs::write(&path, "example.com ssh-ed25519 SHA256:abc123\n").unwrap();
        let store = KnownHostsStore::new(path);

        let result = store
            .verify("example.com", 22, "SHA256:abc123", "ssh-ed25519")
            .unwrap();
        assert!(matches!(result, HostKeyVerification::Accepted));

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn verify_does_not_accept_different_port_entry() {
        let dir = temp_dir();
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("known_hosts");
        fs::write(&path, "[example.com]:2222 ssh-ed25519 SHA256:abc123\n").unwrap();
        let store = KnownHostsStore::new(path);

        let result = store
            .verify("example.com", 22, "SHA256:abc123", "ssh-ed25519")
            .unwrap();
        assert!(matches!(result, HostKeyVerification::Unknown { .. }));

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn verify_treats_same_fingerprint_with_different_key_type_as_changed() {
        let dir = temp_dir();
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("known_hosts");
        fs::write(&path, "[example.com]:22 ssh-rsa SHA256:abc123\n").unwrap();
        let store = KnownHostsStore::new(path);

        let result = store
            .verify("example.com", 22, "SHA256:abc123", "ssh-ed25519")
            .unwrap();
        assert!(matches!(result, HostKeyVerification::Changed { .. }));

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn accept_appends_to_known_hosts() {
        let dir = temp_dir();
        let path = dir.join("known_hosts");
        let store = KnownHostsStore::new(path.clone());

        store
            .accept("example.com", 22, "ssh-ed25519", "SHA256:abc123")
            .unwrap();

        let content = fs::read_to_string(&path).unwrap();
        assert!(content.contains("[example.com]:22 ssh-ed25519 SHA256:abc123"));

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn compute_fingerprint_produces_sha256() {
        let fingerprint = KnownHostsStore::compute_fingerprint(b"test-key-data");
        assert!(fingerprint.starts_with("SHA256:"));
    }

    fn temp_dir() -> std::path::PathBuf {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("vrshell-known-hosts-test-{unique}"))
    }
}
