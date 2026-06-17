//! Known_hosts management 鈥?OpenSSH-compatible reading, writing, and hashing.
//!
//! Supports all standard known_hosts formats:
//! - Plain hostname, bracketed `[host]:port`, comma鈥憇eparated multi鈥慼ost
//! - Hashed hostnames `|1|<salt>|<hash>` (HMAC鈥慡HA1)
//! - `@cert-authority` and `@revoked` markers
//! - Only exact + hashed patterns are matched on removal (wildcards are kept)
//!
//! Backups are created before modifying `known_hosts` so no data is lost.

use crate::sessions::{AppState, HostKeyCache, PendingHostKey};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use hmac::{Hmac, Mac};
use sha1::Sha1;
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::atomic::Ordering,
};
use uuid::Uuid;

type HmacSha1 = Hmac<Sha1>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// OpenSSH uses a 16鈥慴yte random salt for each hashed hostname.
const HASH_SALT_LEN: usize = 16;

// ---------------------------------------------------------------------------
// Hostname hashing  (OpenSSH `HashKnownHosts` compatible)
// ---------------------------------------------------------------------------

/// Generate a cryptographically random 16鈥慴yte salt via UUIDv4.
fn generate_salt() -> [u8; HASH_SALT_LEN] {
    Uuid::new_v4().into_bytes()
}

/// Compute HMAC鈥慡HA1 of `data` with the given 16鈥慴yte `key` (the salt).
fn hmac_sha1(key: &[u8], data: &[u8]) -> [u8; 20] {
    let mut mac = HmacSha1::new_from_slice(key).expect("HMAC accepts any key length");
    mac.update(data);
    let result = mac.finalize();
    let code = result.into_bytes();
    let mut out = [0u8; 20];
    out.copy_from_slice(&code);
    out
}

// ---------------------------------------------------------------------------
// Base64 helpers
// ---------------------------------------------------------------------------

fn b64_encode(data: &[u8]) -> String {
    BASE64.encode(data)
}

fn b64_decode(s: &str) -> Option<Vec<u8>> {
    BASE64.decode(s).ok()
}

// ---------------------------------------------------------------------------
// Hashed鈥憄attern helpers
// ---------------------------------------------------------------------------

/// Parse field `|1|<salt_b64>|<hash_b64>` into its 16鈥慴yte salt and 20鈥慴yte
/// hash components.
fn decode_hashed_pattern(field: &str) -> Option<([u8; 16], [u8; 20])> {
    let rest = field.strip_prefix("|1|")?;
    let (salt_b64, hash_b64) = rest.split_once('|')?;
    let salt_bytes = b64_decode(salt_b64)?;
    let hash_bytes = b64_decode(hash_b64)?;
    if salt_bytes.len() != 16 || hash_bytes.len() != 20 {
        return None;
    }
    let mut salt = [0u8; 16];
    let mut hash = [0u8; 20];
    salt.copy_from_slice(&salt_bytes);
    hash.copy_from_slice(&hash_bytes);
    Some((salt, hash))
}

/// Check whether a hashed known_hosts pattern (`|1|鈥) matches `host:port`.
///
/// OpenSSH hashes just the hostname for port鈥?2 and `[host]:port` for
/// non鈥憇tandard ports.  We try both forms for robustness.
fn matches_hashed_pattern(field: &str, host: &str, port: u16) -> bool {
    let (salt, expected) = match decode_hashed_pattern(field) {
        Some(v) => v,
        None => return false,
    };
    if hmac_sha1(&salt, host.as_bytes()) == expected {
        return true;
    }
    let bracketed = format!("[{}]:{}", host, port);
    hmac_sha1(&salt, bracketed.as_bytes()) == expected
}

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

/// Simple glob: `*` matches any sequence, `?` matches any single byte.
fn wildcard_match(pattern: &str, host: &str) -> bool {
    if pattern.is_empty() {
        return host.is_empty();
    }
    wildcard_core(pattern.as_bytes(), host.as_bytes(), 0, 0)
}

fn wildcard_core(p: &[u8], h: &[u8], pi: usize, hi: usize) -> bool {
    if pi >= p.len() {
        return hi >= h.len();
    }
    match p[pi] {
        b'*' => (hi..=h.len()).any(|i| wildcard_core(p, h, pi + 1, i)),
        b'?' => hi < h.len() && wildcard_core(p, h, pi + 1, hi + 1),
        c => hi < h.len() && h[hi] == c && wildcard_core(p, h, pi + 1, hi + 1),
    }
}

/// Check whether a single known_hosts pattern matches `host:port`.
///
/// When `exact_only` is `true` (used during entry removal) wildcard patterns
/// are skipped to avoid accidentally removing entries covering other hosts.
fn matches_single_pattern(pattern: &str, host: &str, port: u16, exact_only: bool) -> bool {
    let tr = pattern.trim();

    // Bracketed with port:  [host]:port
    if let Some((inner, port_str)) = tr.strip_prefix('[').and_then(|s| s.rsplit_once("]:")) {
        if inner == host && port_str == port.to_string() {
            return true;
        }
    }

    // [host] without port 鈥?treated as port 22
    if let Some(inner) = tr.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
        if inner == host && port == 22 {
            return true;
        }
    }

    // Plain hostname 鈥?port 22 only
    if port == 22 && tr == host {
        return true;
    }

    // Hashed pattern
    if tr.starts_with("|1|") && matches_hashed_pattern(tr, host, port) {
        return true;
    }

    // Wildcard 鈥?skipped during removal to avoid over鈥慴road matches
    if !exact_only && (tr.contains('*') || tr.contains('?')) {
        return wildcard_match(tr, host);
    }

    false
}

/// Check the whole comma鈥憇eparated host鈥憄atterns field.
fn matches_host_patterns(patterns: &str, host: &str, port: u16, exact_only: bool) -> bool {
    patterns
        .split(',')
        .any(|p| matches_single_pattern(p, host, port, exact_only))
}

// ---------------------------------------------------------------------------
// Line formatting
// ---------------------------------------------------------------------------

/// Format a known_hosts line.
///
/// When `hash` is `true` the host pattern is replaced by an OpenSSH鈥慶ompatible
/// `|1|<salt>|<hash>` token.  For port鈥?2 only the hostname is hashed; for
/// non鈥憇tandard ports the `[host]:port` text is hashed instead.
pub(crate) fn format_known_hosts_line(
    host: &str,
    port: u16,
    key_type: &str,
    key_base64: &str,
    hash: bool,
) -> String {
    let host_pattern = if hash {
        let salt = generate_salt();
        let data = if port == 22 {
            host.as_bytes().to_vec()
        } else {
            format!("[{}]:{}", host, port).into_bytes()
        };
        let hash_bytes = hmac_sha1(&salt, &data);
        format!("|1|{}|{}", b64_encode(&salt), b64_encode(&hash_bytes))
    } else if port == 22 {
        host.to_string()
    } else {
        format!("[{}]:{}", host, port)
    };
    format!("{} {} {}", host_pattern, key_type, key_base64)
}

// ---------------------------------------------------------------------------
// Entry removal
// ---------------------------------------------------------------------------

/// Remove all known_hosts entries whose host patterns match `host:port`.
///
/// Handles all standard OpenSSH line forms:
///   patterns key鈥憈ype key鈥慴ase64 [comment]
///   \@cert鈥慳uthority patterns key鈥憈ype key鈥慴ase64 [comment]
///   \@revoked patterns key鈥憈ype key鈥慴ase64 [comment]
///
/// During removal only exact hostname, bracketed, and hashed matches are
/// removed 鈥?wildcard entries (`*.example.com`) are kept so other hosts
/// covered by the same wildcard are unaffected.
///
/// Returns the removed lines (for informational / auditing purposes).
pub(crate) fn remove_known_host_entry(
    path: &Path,
    host: &str,
    port: u16,
) -> Result<Vec<String>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path).map_err(|e| format!("read known_hosts err: {}", e))?;
    let mut retained: Vec<String> = Vec::new();
    let mut removed: Vec<String> = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();

        // Empty lines and comments are kept as-is.
        if trimmed.is_empty() || trimmed.starts_with('#') {
            retained.push(line.to_string());
            continue;
        }

        // Strip optional marker prefix to get the host鈥憄atterns field.
        let parse_body = trimmed
            .strip_prefix("@cert-authority ")
            .or_else(|| trimmed.strip_prefix("@revoked "))
            .unwrap_or(trimmed);

        let first_field = match parse_body.split_once(|c: char| c.is_whitespace()) {
            Some((f, _)) => f,
            None => {
                // Malformed line 鈥?keep rather than lose data.
                retained.push(line.to_string());
                continue;
            }
        };

        if matches_host_patterns(first_field, host, port, true /* exact_only */) {
            removed.push(line.to_string());
        } else {
            retained.push(line.to_string());
        }
    }

    let mut new_content = retained.join("\n");
    if !new_content.is_empty() {
        new_content.push('\n');
    }
    // Preserve an empty state as an empty file (OpenSSH handles this fine).

    fs::write(path, &new_content).map_err(|e| format!("write known_hosts err: {}", e))?;

    Ok(removed)
}

// ---------------------------------------------------------------------------
// Backup helpers
// ---------------------------------------------------------------------------

/// Path for a timestamped backup of `known_hosts`.
pub(crate) fn backup_path(original: &Path) -> PathBuf {
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let file_name = format!(
        "{}{}.{}",
        original
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("known_hosts"),
        ".vrshell.bak",
        stamp,
    );
    original.with_file_name(file_name)
}

// ---------------------------------------------------------------------------
// Config helpers (used by commands)
// ---------------------------------------------------------------------------

/// Resolve the effective known_hosts path:
///   1. override from `AppState`, if set
///   2. fallback to `~/.ssh/known_hosts`
pub(crate) fn effective_known_hosts_path(state: &AppState) -> Option<PathBuf> {
    if let Ok(guard) = state.known_hosts_path_override.lock() {
        if let Some(ref p) = *guard {
            return Some(p.clone());
        }
    }
    default_known_hosts_path()
}

/// Resolve the known_hosts path from just the override field (for use in OS threads).
pub(crate) fn effective_known_hosts_path_from_override(
    override_lock: &std::sync::Mutex<Option<PathBuf>>,
) -> Option<PathBuf> {
    if let Ok(guard) = override_lock.lock() {
        if let Some(ref p) = *guard {
            return Some(p.clone());
        }
    }
    default_known_hosts_path()
}

fn default_known_hosts_path() -> Option<PathBuf> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()?;
    if home.is_empty() {
        return None;
    }
    Some(PathBuf::from(&home).join(".ssh").join("known_hosts"))
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Return the fingerprint of a pending host key.
#[tauri::command]
pub async fn get_host_key_fingerprint(
    state: tauri::State<'_, AppState>,
    host: String,
    port: u16,
) -> Result<String, String> {
    let cache = state
        .pending_host_keys
        .lock()
        .map_err(|e| format!("lock err: {}", e))?;
    let entry = cache
        .iter()
        .find(|k| k.host == host && k.port == port)
        .ok_or_else(|| format!("no pending host key for {}:{}", host, port))?;
    Ok(entry.fingerprint.clone())
}

/// Accept a pending host key.
///
/// 1. Backs up the current `known_hosts` to a timestamped `.vrshell.bak` file.
/// 2. Removes stale entries for `host:port`.
/// 3. Appends the new entry (hostname hashed if `hash_known_hosts` is enabled).
/// 4. Removes the pending key from the cache.
#[tauri::command]
pub async fn accept_host_key(
    state: tauri::State<'_, AppState>,
    host: String,
    port: u16,
) -> Result<(), String> {
    // --- extract the pending entry from the cache ---
    let entry = {
        let mut cache = state
            .pending_host_keys
            .lock()
            .map_err(|e| format!("lock err: {}", e))?;
        let idx = cache
            .iter()
            .position(|k| k.host == host && k.port == port)
            .ok_or_else(|| format!("no pending host key for {}:{}", host, port))?;
        cache.remove(idx)
    };

    let kh_path = effective_known_hosts_path(&state)
        .ok_or_else(|| "cannot determine known_hosts path".to_string())?;

    // --- backup before any modification ---
    if kh_path.exists() {
        let backup = backup_path(&kh_path);
        fs::copy(&kh_path, &backup).map_err(|e| format!("backup known_hosts err: {}", e))?;
    }

    // --- remove stale entries for this host:port ---
    remove_known_host_entry(&kh_path, &host, port)?;

    // --- determine whether to hash the hostname ---
    let hash_enabled = state.hash_known_hosts.load(Ordering::Relaxed);

    let line = format_known_hosts_line(
        &entry.host,
        entry.port,
        &entry.key_type,
        &entry.key_base64,
        hash_enabled,
    );

    // --- append the new entry ---
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&kh_path)
        .map_err(|e| format!("open known_hosts err: {}", e))?;

    // Ensure a leading newline if the file already has content that doesn't
    // end with one (the remove step above ensures trailing \n, but we may be
    // appending to a pre鈥慹xisting file that didn't have one).
    if kh_path.exists() {
        let existing =
            fs::read_to_string(&kh_path).map_err(|e| format!("reread known_hosts err: {}", e))?;
        if !existing.ends_with('\n') && !existing.is_empty() {
            writeln!(file).map_err(|e| format!("write known_hosts err: {}", e))?;
        }
    }

    writeln!(file, "{}", line).map_err(|e| format!("write known_hosts err: {}", e))?;

    Ok(())
}

/// Cache a host key pending user acceptance.
pub(crate) fn cache_pending_host_key(
    cache: &HostKeyCache,
    host: &str,
    port: u16,
    fingerprint: String,
    key_type: String,
    key_base64: String,
) -> Result<(), String> {
    let mut cache = cache.lock().map_err(|e| format!("lock err: {}", e))?;
    cache.retain(|k| !(k.host == host && k.port == port));
    cache.push(PendingHostKey {
        host: host.to_string(),
        port,
        fingerprint,
        key_type,
        key_base64,
    });
    Ok(())
}

// ---------------------------------------------------------------------------
// Known鈥慼osts config commands (stored in AppState)
// ---------------------------------------------------------------------------

/// Return whether hostname hashing is enabled for new known_hosts entries.
#[tauri::command]
pub async fn get_hash_known_hosts(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    Ok(state.hash_known_hosts.load(Ordering::Relaxed))
}

/// Enable or disable hostname hashing for new known_hosts entries.
#[tauri::command]
pub async fn set_hash_known_hosts(
    state: tauri::State<'_, AppState>,
    enabled: bool,
) -> Result<(), String> {
    state.hash_known_hosts.store(enabled, Ordering::Relaxed);
    Ok(())
}

/// Return the custom known_hosts path override, if one is set.
#[tauri::command]
pub async fn get_known_hosts_path(
    state: tauri::State<'_, AppState>,
) -> Result<Option<String>, String> {
    let guard = state
        .known_hosts_path_override
        .lock()
        .map_err(|e| format!("lock err: {}", e))?;
    Ok(guard
        .as_ref()
        .and_then(|p| p.to_str().map(|s| s.to_string())))
}

/// Set a custom known_hosts path (pass `None` / `null` to reset to default).
#[tauri::command]
pub async fn set_known_hosts_path(
    state: tauri::State<'_, AppState>,
    path: Option<String>,
) -> Result<(), String> {
    let mut guard = state
        .known_hosts_path_override
        .lock()
        .map_err(|e| format!("lock err: {}", e))?;
    *guard = path.map(PathBuf::from);
    Ok(())
}
