use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use serde_json::{Map, Value};
use std::{
    collections::VecDeque,
    fmt, fs,
    net::{TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::Duration,
};

use crate::interaction::{self, InteractionContext, InteractionRequest, InteractionResponse};

/// Default per-address TCP connect timeout (used when no overall timeout is given).
const DEFAULT_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// Apply TCP socket options for interactive SSH sessions:
/// - `TCP_NODELAY`: disable Nagle algorithm 鈫?lower latency for keystrokes
/// - `SO_KEEPALIVE`: OS鈥憀evel liveness probes 鈫?faster dead鈥慶onnection detection
fn tune_tcp_stream(tcp: &TcpStream) {
    let _ = tcp.set_nodelay(true);
    let sock = socket2::SockRef::from(tcp);
    let _ = sock.set_keepalive(true);
    let _ =
        sock.set_tcp_keepalive(&socket2::TcpKeepalive::new().with_time(Duration::from_secs(60)));
}

/// Get the SSH config directory (~/.ssh), creating it if it doesn't exist.
fn ssh_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()?;
    if home.is_empty() {
        return None;
    }
    let dir = PathBuf::from(&home).join(".ssh");
    let _ = fs::create_dir_all(&dir);
    Some(dir)
}

/// Get the path to ~/.ssh/known_hosts (public for host_key.rs).
pub(crate) fn known_hosts_path() -> Option<PathBuf> {
    ssh_dir().map(|d| d.join("known_hosts"))
}

/// Structured error for SSH connection operations.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SshError {
    pub code: String,
    pub message: String,
    pub recoverable: bool,
    #[serde(skip_serializing_if = "Map::is_empty")]
    pub details: Map<String, Value>,
}

impl SshError {
    pub fn new(code: impl Into<String>, message: impl Into<String>, recoverable: bool) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            recoverable,
            details: Map::new(),
        }
    }

    pub fn with_fingerprint(
        code: impl Into<String>,
        message: impl Into<String>,
        fingerprint: String,
    ) -> Self {
        let mut details = Map::new();
        details.insert("hostKeyFingerprint".to_string(), Value::String(fingerprint));
        Self {
            code: code.into(),
            message: message.into(),
            recoverable: true,
            details,
        }
    }
}

impl fmt::Display for SshError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

/// Allow `?` on String errors inside functions returning SshError.
impl From<String> for SshError {
    fn from(message: String) -> Self {
        let lower = message.to_lowercase();
        let code = if lower.contains("resolve") {
            "dns_resolve"
        } else if lower.contains("timeout") || lower.contains("connect") {
            "tcp_connect"
        } else if lower.contains("session") {
            "session_create"
        } else if lower.contains("handshake") {
            "handshake"
        } else if lower.contains("auth") && lower.contains("agent") {
            "auth_agent"
        } else if lower.contains("auth") {
            "auth_failed"
        } else if lower.contains("host key") && lower.contains("mismatch") {
            "host_key_mismatch"
        } else if lower.contains("host key") && lower.contains("unknown") {
            "host_key_unknown"
        } else {
            "unknown"
        };
        let recoverable = matches!(
            code,
            "dns_resolve" | "tcp_connect" | "auth_failed" | "auth_agent" | "host_key_unknown"
        );
        Self::new(code, message, recoverable)
    }
}

/// Allow `?` on `ssh2::Error` inside functions returning `SshError`.
/// Uses the raw libssh2 error code for precise classification.
impl From<ssh2::Error> for SshError {
    fn from(e: ssh2::Error) -> Self {
        let message = e.message().to_string();
        let code = match e.code() {
            ssh2::ErrorCode::Session(rc) => match rc {
                -2 | -3 | -5 | -8 | -11 | -12 | -44 => "handshake",
                -9 | -30 => "tcp_connect",
                -10 | -46 => "known_hosts",
                -13 | -43 | -45 => "tcp_connect",
                -15 | -18 => "auth_failed",
                -19 => "auth_key",
                -27..=-21 => "session_create",
                -42 => "auth_agent",
                -31 => "sftp_error",
                _ => {
                    // Fallback to string鈥慴ased heuristics for unknown codes.
                    let lower = message.to_lowercase();
                    if lower.contains("timeout") || lower.contains("connect") {
                        "tcp_connect"
                    } else if lower.contains("auth") && lower.contains("agent") {
                        "auth_agent"
                    } else if lower.contains("auth") {
                        "auth_failed"
                    } else if lower.contains("host key") && lower.contains("mismatch") {
                        "host_key_mismatch"
                    } else if lower.contains("host key") && lower.contains("unknown") {
                        "host_key_unknown"
                    } else if lower.contains("handshake") || lower.contains("kex") {
                        "handshake"
                    } else {
                        "unknown"
                    }
                }
            },
            ssh2::ErrorCode::SFTP(rc) => match rc {
                1 | 2 => "not_found",
                3 => "permission_denied",
                _ => "sftp_error",
            },
        };
        let recoverable = matches!(
            code,
            "dns_resolve"
                | "tcp_connect"
                | "auth_failed"
                | "auth_agent"
                | "auth_key"
                | "handshake"
                | "host_key_unknown"
                | "sftp_error"
        );
        Self::new(code, message, recoverable)
    }
}

/// The result of a successful SSH connection.
pub struct SshConnection {
    pub session: ssh2::Session,
}

#[derive(Debug, Clone, Copy)]
pub struct AuthOptions<'a> {
    pub username: &'a str,
    pub password: Option<&'a str>,
    pub private_key_path: Option<&'a str>,
    pub passphrase: Option<&'a str>,
}

#[derive(Clone, Copy)]
pub struct InteractionOptions<'a> {
    pub context: Option<&'a InteractionContext>,
    pub app: Option<&'a tauri::AppHandle>,
    pub session_id: Option<&'a str>,
    pub output_queue: Option<&'a Arc<Mutex<VecDeque<String>>>>,
    pub interactive: bool,
}

impl<'a> InteractionOptions<'a> {
    pub fn none() -> Self {
        Self {
            context: None,
            app: None,
            session_id: None,
            output_queue: None,
            interactive: false,
        }
    }
}

pub struct ConnectOptions<'a> {
    pub host: &'a str,
    pub port: u16,
    pub auth: AuthOptions<'a>,
    pub connect_timeout: Option<Duration>,
    pub verify_known_hosts: bool,
    pub host_key_cache: Option<&'a crate::sessions::HostKeyCache>,
    pub interaction: InteractionOptions<'a>,
}

/// Verify the host key against known_hosts.
///
/// In **interactive mode** (when `app`, `state`, and `session_id` are all
/// provided and `interactive` is true), unknown / mismatched keys trigger a
/// blocking `request_interaction()` call so the user can accept or reject
/// without tearing down the TCP + SSH handshake.
///
/// In **non-interactive mode** (SFTP, connection tests) the old behaviour is
/// preserved: the key is cached in `host_key_cache` and a recoverable error
/// is returned.
#[allow(clippy::too_many_arguments)]
fn verify_host_key(
    sess: &ssh2::Session,
    host: &str,
    port: u16,
    host_key_cache: Option<&crate::sessions::HostKeyCache>,
    interaction_ctx: Option<&InteractionContext>,
    app: Option<&tauri::AppHandle>,
    session_id: Option<&str>,
    output_queue: Option<&Arc<Mutex<VecDeque<String>>>>,
    interactive: bool,
) -> Result<(), SshError> {
    let (host_key_bytes, key_type) = sess
        .host_key()
        .ok_or_else(|| SshError::new("handshake", "no host key received from server", false))?;
    let key_type_name = open_ssh_host_key_type(key_type);

    // Compute SHA256 fingerprint for display to user
    let fingerprint_bytes = sess
        .host_key_hash(ssh2::HashType::Sha256)
        .ok_or_else(|| SshError::new("handshake", "host key hash unavailable", false))?;
    let fingerprint = format!(
        "SHA256:{}",
        STANDARD.encode(fingerprint_bytes).trim_end_matches('=')
    );
    let key_base64 = STANDARD.encode(host_key_bytes);

    let known_hosts_path = match known_hosts_path() {
        Some(p) => p,
        None => return Ok(()), // Can't determine home directory; skip check.
    };

    let mut known_hosts = sess
        .known_hosts()
        .map_err(|e| SshError::new("known_hosts", format!("init known_hosts err: {}", e), false))?;

    if known_hosts_path.exists() {
        known_hosts
            .read_file(&known_hosts_path, ssh2::KnownHostFileKind::OpenSSH)
            .map_err(|e| {
                SshError::new("known_hosts", format!("read known_hosts err: {}", e), false)
            })?;
    }

    match known_hosts.check_port(host, port, host_key_bytes) {
        ssh2::CheckResult::Match => Ok(()),

        ssh2::CheckResult::Mismatch | ssh2::CheckResult::NotFound => {
            let is_mismatch = matches!(
                known_hosts.check_port(host, port, host_key_bytes),
                ssh2::CheckResult::Mismatch
            );

            // --- interactive path: block and wait for user decision ---
            if let (true, Some(app), Some(interaction_ctx), Some(session_id)) =
                (interactive, app, interaction_ctx, session_id)
            {
                let response = interaction::request_interaction(
                    app,
                    interaction_ctx,
                    session_id,
                    InteractionRequest::HostKeyVerification {
                        host: host.to_string(),
                        port,
                        fingerprint: fingerprint.clone(),
                        key_type: key_type_name.to_string(),
                        is_mismatch,
                    },
                    output_queue,
                )?;

                match response {
                    InteractionResponse::HostKeyAccepted => {
                        // Write to known_hosts immediately so the session
                        // continues on the same connection.
                        accept_host_key_inline(
                            interaction_ctx,
                            host,
                            port,
                            &fingerprint,
                            key_type_name,
                            &key_base64,
                        )?;
                        Ok(())
                    }
                    InteractionResponse::HostKeyRejected | InteractionResponse::Cancel => {
                        Err(SshError::new(
                            "cancelled",
                            if is_mismatch {
                                "Host key replacement cancelled by user"
                            } else {
                                "Host key acceptance cancelled by user"
                            },
                            false,
                        ))
                    }
                    _ => Err(SshError::new(
                        "interaction",
                        "Unexpected response type for host key verification",
                        false,
                    )),
                }
            } else {
                // --- non-interactive path: cache + return error (old behaviour) ---
                if let Some(cache) = host_key_cache {
                    let _ = crate::host_key::cache_pending_host_key(
                        cache,
                        host,
                        port,
                        fingerprint.clone(),
                        key_type_name.to_string(),
                        key_base64,
                    );
                }
                let (code, message) = if is_mismatch {
                    (
                        "host_key_mismatch",
                        format!(
                            "WARNING: Host key for {}:{} has changed! Possible MITM attack!\n\
                             New fingerprint: {}",
                            host, port, fingerprint
                        ),
                    )
                } else {
                    (
                        "host_key_unknown",
                        format!(
                            "The authenticity of host '{}:{}' can't be established.\n\
                             Fingerprint: {}",
                            host, port, fingerprint
                        ),
                    )
                };
                Err(SshError::with_fingerprint(code, message, fingerprint))
            }
        }
        ssh2::CheckResult::Failure => Err(SshError::new(
            "known_hosts",
            format!("known_hosts check failed for {}:{}", host, port),
            false,
        )),
    }
}

/// Directly write a host key entry to known_hosts 鈥?used inside the
/// interactive host-key flow where we already hold the session open.
fn accept_host_key_inline(
    ctx: &InteractionContext,
    host: &str,
    port: u16,
    fingerprint: &str,
    key_type: &str,
    key_base64: &str,
) -> Result<(), SshError> {
    use std::io::Write;

    let kh_path = crate::host_key::effective_known_hosts_path_from_override(
        &ctx.known_hosts_path_override,
    )
    .ok_or_else(|| SshError::new("known_hosts", "cannot determine known_hosts path", false))?;

    // Backup before modification.
    if kh_path.exists() {
        let backup = crate::host_key::backup_path(&kh_path);
        fs::copy(&kh_path, &backup)
            .map_err(|e| SshError::new("known_hosts", format!("backup err: {}", e), false))?;
    }

    // Remove stale entries.
    crate::host_key::remove_known_host_entry(&kh_path, host, port)
        .map_err(|e| SshError::new("known_hosts", e, false))?;

    // Determine whether to hash.
    let hash_enabled = ctx
        .hash_known_hosts
        .load(std::sync::atomic::Ordering::Relaxed);

    let line =
        crate::host_key::format_known_hosts_line(host, port, key_type, key_base64, hash_enabled);

    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&kh_path)
        .map_err(|e| SshError::new("known_hosts", format!("open err: {}", e), false))?;

    if kh_path.exists() {
        let existing = fs::read_to_string(&kh_path)
            .map_err(|e| SshError::new("known_hosts", format!("reread err: {}", e), false))?;
        if !existing.ends_with('\n') && !existing.is_empty() {
            writeln!(file)
                .map_err(|e| SshError::new("known_hosts", format!("write err: {}", e), false))?;
        }
    }

    writeln!(file, "{}", line)
        .map_err(|e| SshError::new("known_hosts", format!("write err: {}", e), false))?;

    let _ = fingerprint; // keep for logging in future
    Ok(())
}

fn configure_algorithm_preferences(sess: &ssh2::Session) {
    let _ = sess.method_pref(
        ssh2::MethodType::Kex,
        "curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group-exchange-sha256",
    );
    let _ = sess.method_pref(
        ssh2::MethodType::HostKey,
        "ssh-ed25519,rsa-sha2-512,rsa-sha2-256,ssh-rsa",
    );
    let _ = sess.method_pref(
        ssh2::MethodType::CryptCs,
        "aes128-ctr,aes192-ctr,aes256-ctr,aes128-gcm@openssh.com,aes256-gcm@openssh.com",
    );
    let _ = sess.method_pref(
        ssh2::MethodType::CryptSc,
        "aes128-ctr,aes192-ctr,aes256-ctr,aes128-gcm@openssh.com,aes256-gcm@openssh.com",
    );
    let _ = sess.method_pref(
        ssh2::MethodType::MacCs,
        "hmac-sha2-512,hmac-sha2-256,hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com",
    );
    let _ = sess.method_pref(
        ssh2::MethodType::MacSc,
        "hmac-sha2-512,hmac-sha2-256,hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com",
    );
}

fn open_ssh_host_key_type(key_type: ssh2::HostKeyType) -> &'static str {
    match key_type {
        ssh2::HostKeyType::Rsa => "ssh-rsa",
        ssh2::HostKeyType::Dss => "ssh-dss",
        ssh2::HostKeyType::Ecdsa256 => "ecdsa-sha2-nistp256",
        ssh2::HostKeyType::Ecdsa384 => "ecdsa-sha2-nistp384",
        ssh2::HostKeyType::Ecdsa521 => "ecdsa-sha2-nistp521",
        ssh2::HostKeyType::Ed25519 => "ssh-ed25519",
        ssh2::HostKeyType::Unknown => "ssh-rsa",
    }
}

/// Shared SSH connection function used by both terminal and SFTP paths.
///
/// 1. Resolves DNS with timeout
/// 2. TCP connect (with timeout if provided)
/// 3. Creates ssh2 session, sets TCP stream, enables compression, handshakes
/// 4. Verifies host key against ~/.ssh/known_hosts (optionally interactive)
/// 5. Authenticates (optionally interactive for credential retry)
///
/// When `interactive` is true the host-key and auth steps may block on
/// `request_interaction()` so the user can accept keys or supply credentials
/// without tearing down the TCP + SSH handshake.
///
/// Returns the connected and authenticated session.
pub fn connect_ssh_session(options: ConnectOptions<'_>) -> Result<SshConnection, SshError> {
    let ConnectOptions {
        host,
        port,
        auth,
        connect_timeout,
        verify_known_hosts,
        host_key_cache,
        interaction,
    } = options;
    let InteractionOptions {
        context: interaction_ctx,
        app,
        session_id,
        output_queue,
        interactive,
    } = interaction;
    // --- resolve all A / AAAA records ---
    let addr_str = format!("{}:{}", host, port);
    let mut socket_addrs: Vec<std::net::SocketAddr> = addr_str
        .to_socket_addrs()
        .map_err(|e| SshError::new("dns_resolve", format!("resolve addr error: {}", e), true))?
        .collect();

    if socket_addrs.is_empty() {
        return Err(SshError::new(
            "dns_resolve",
            format!("resolve addr error: no address for {}", addr_str),
            true,
        ));
    }

    // --- try each address with a time鈥憇liced timeout ---
    let addrs_len = socket_addrs.len().max(1) as u32;
    let per_addr_timeout = connect_timeout
        .map(|t| (t / addrs_len).max(Duration::from_secs(3)))
        .unwrap_or(DEFAULT_CONNECT_TIMEOUT);

    let mut last_err = None;
    let tcp = loop {
        let addr = match socket_addrs.first() {
            Some(&a) => a,
            None => {
                break Err(last_err.unwrap_or_else(|| {
                    SshError::new("tcp_connect", "all addresses failed".to_string(), true)
                }))
            }
        };

        match TcpStream::connect_timeout(&addr, per_addr_timeout) {
            Ok(stream) => {
                tune_tcp_stream(&stream);
                break Ok(stream);
            }
            Err(e) => {
                last_err = Some(SshError::new(
                    "tcp_connect",
                    format!("connect to {}:{} err: {}", host, port, e),
                    true,
                ));
                socket_addrs = socket_addrs.split_off(1);
            }
        }
    }?;

    let mut sess = ssh2::Session::new().map_err(|e| {
        SshError::new(
            "session_create",
            format!("create ssh session err: {}", e),
            false,
        )
    })?;
    sess.set_tcp_stream(tcp);
    configure_algorithm_preferences(&sess);
    sess.set_compress(false);
    sess.handshake().map_err(|e| {
        SshError::new(
            "handshake",
            format!(
                "handshake err: {}. The server may require SSH algorithms unsupported by the bundled libssh2.",
                e
            ),
            true,
        )
    })?;

    // Verify host key before authenticating (may block for user decision).
    if verify_known_hosts {
        verify_host_key(
            &sess,
            host,
            port,
            host_key_cache,
            interaction_ctx,
            app,
            session_id,
            output_queue,
            interactive,
        )?;
    }

    // --- authenticate (with optional interactive retry) ---
    authenticate_session(&sess, host, auth, interaction)?;

    Ok(SshConnection { session: sess })
}

/// Authenticate the session, optionally looping into interactive mode when
/// all pre-configured methods fail.
fn authenticate_session(
    sess: &ssh2::Session,
    host: &str,
    auth: AuthOptions<'_>,
    interaction: InteractionOptions<'_>,
) -> Result<(), SshError> {
    let AuthOptions {
        username,
        password,
        private_key_path,
        passphrase,
    } = auth;
    let InteractionOptions {
        context: interaction_ctx,
        app,
        session_id,
        output_queue,
        interactive,
    } = interaction;
    let mut tried: Vec<String> = Vec::new();

    if try_auth_chain(
        sess,
        host,
        username,
        password,
        private_key_path,
        passphrase,
        &mut tried,
    ) {
        return Ok(());
    }

    let (app, interaction_ctx, session_id) = match (interactive, app, interaction_ctx, session_id) {
        (true, Some(app), Some(interaction_ctx), Some(session_id)) => {
            (app, interaction_ctx, session_id)
        }
        _ => {
            return Err(SshError::new(
                "auth_failed",
                format!("authentication failed - tried: {}", tried.join(", ")),
                true,
            ))
        }
    };

    loop {
        let error_hint = "Authentication failed with the provided credentials".to_string();
        let response = interaction::request_interaction(
            app,
            interaction_ctx,
            session_id,
            InteractionRequest::AuthenticationNeeded {
                host: host.to_string(),
                username: username.to_string(),
                tried_methods: tried.clone(),
                available_methods: vec!["password".into(), "publickey".into()],
                error_hint: Some(error_hint),
            },
            output_queue,
        )?;

        match response {
            InteractionResponse::Credentials {
                password: new_pw,
                private_key_path: new_key,
                passphrase: new_pp,
            } => {
                let pw = new_pw.as_deref();
                let key = new_key.as_deref();
                let pp = new_pp.as_deref();

                if let Some(kp) = key.filter(|v| !v.is_empty()) {
                    tried.push("publickey (user)".to_string());
                    if sess
                        .userauth_pubkey_file(
                            username,
                            None,
                            Path::new(kp),
                            pp.filter(|v| !v.is_empty()),
                        )
                        .is_ok()
                        && sess.authenticated()
                    {
                        return Ok(());
                    }
                }

                if let Some(p) = pw.filter(|v| !v.is_empty()) {
                    tried.push("password (user)".to_string());
                    if sess.userauth_password(username, p).is_ok() && sess.authenticated() {
                        return Ok(());
                    }
                }
            }
            InteractionResponse::Cancel => {
                return Err(SshError::new(
                    "cancelled",
                    "Authentication cancelled by user",
                    false,
                ));
            }
            _ => {
                return Err(SshError::new(
                    "interaction",
                    "Unexpected response type for authentication",
                    false,
                ));
            }
        }
    }
}

/// Run the standard auth chain: agent 鈫?explicit key 鈫?auto key 鈫?password.
/// Returns `true` on success and populates `tried` for diagnostics.
fn try_auth_chain(
    sess: &ssh2::Session,
    host: &str,
    username: &str,
    password: Option<&str>,
    private_key_path: Option<&str>,
    passphrase: Option<&str>,
    tried: &mut Vec<String>,
) -> bool {
    // 1. SSH agent
    tried.push("agent".to_string());
    if sess.userauth_agent(username).is_ok() && sess.authenticated() {
        return true;
    }

    // 2. Private key file (explicit)
    if let Some(key_path) = private_key_path.filter(|v| !v.is_empty()) {
        tried.push("publickey".to_string());
        if sess
            .userauth_pubkey_file(
                username,
                None,
                Path::new(key_path),
                passphrase.filter(|v| !v.is_empty()),
            )
            .is_ok()
            && sess.authenticated()
        {
            return true;
        }
    }

    // 2b. Private key from ~/.ssh/config IdentityFile (auto鈥慸etected)
    let auto_key = crate::sessions::lookup_identity_file(host);
    if let Some(ref key_path) = auto_key {
        if Path::new(key_path).exists() {
            tried.push("publickey (config)".to_string());
            if sess
                .userauth_pubkey_file(username, None, Path::new(key_path), None)
                .is_ok()
                && sess.authenticated()
            {
                return true;
            }
        }
    }

    // 3. Password
    if let Some(pw) = password.filter(|v| !v.is_empty()) {
        tried.push("password".to_string());
        if sess.userauth_password(username, pw).is_ok() && sess.authenticated() {
            return true;
        }
    }

    false
}
