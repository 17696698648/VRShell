use crate::{
    domain::sftp::{SftpConnectionRequest, SftpEntry},
    error::{BackendError, BackendResult},
    services::credential_service,
};
use base64::Engine;
use ssh2::{FileStat, Session as SshSession};
use std::{
    env,
    io::Read,
    net::{TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    time::Duration,
};

pub(crate) fn list(
    connection: SftpConnectionRequest,
    path: String,
) -> BackendResult<Vec<SftpEntry>> {
    validate_connection(&connection)?;
    let path = path.trim();
    if path.is_empty() {
        return Err(BackendError::validation("path is required"));
    }

    let session = open_ssh_session(&connection)?;
    let sftp = session
        .sftp()
        .map_err(|error| BackendError::validation(format!("failed to open sftp: {error}")))?;
    let mut entries = sftp
        .readdir(Path::new(path))
        .map_err(|error| BackendError::validation(format!("failed to list sftp path: {error}")))?
        .into_iter()
        .filter_map(|(entry_path, stat)| to_entry(path, entry_path.as_path(), stat))
        .collect::<Vec<_>>();

    entries.sort_by(|left, right| {
        right
            .is_directory
            .cmp(&left.is_directory)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    Ok(entries)
}

pub(crate) fn read_file(
    connection: SftpConnectionRequest,
    remote_path: String,
) -> BackendResult<String> {
    validate_connection(&connection)?;
    let remote_path = remote_path.trim();
    if remote_path.is_empty() {
        return Err(BackendError::validation("remote path is required"));
    }

    let session = open_ssh_session(&connection)?;
    let sftp = session
        .sftp()
        .map_err(|error| BackendError::validation(format!("failed to open sftp: {error}")))?;
    let mut file = sftp.open(Path::new(remote_path)).map_err(|error| {
        BackendError::validation(format!("failed to open remote file: {error}"))
    })?;
    let mut content = Vec::new();
    file.read_to_end(&mut content).map_err(|error| {
        BackendError::validation(format!("failed to read remote file: {error}"))
    })?;
    Ok(base64::engine::general_purpose::STANDARD.encode(content))
}

pub(crate) fn mutate_file_system(feature: &str) -> BackendResult<()> {
    Err(BackendError::not_implemented(feature))
}

fn open_ssh_session(request: &SftpConnectionRequest) -> BackendResult<SshSession> {
    let address = (request.host.as_str(), request.port)
        .to_socket_addrs()
        .map_err(|error| BackendError::validation(format!("failed to resolve host: {error}")))?
        .next()
        .ok_or_else(|| BackendError::validation("host did not resolve to an address"))?;
    let stream = TcpStream::connect_timeout(&address, Duration::from_secs(12)).map_err(|error| {
        BackendError::validation(format!("failed to connect ssh socket: {error}"))
    })?;
    stream
        .set_read_timeout(Some(Duration::from_secs(12)))
        .map_err(|error| BackendError::validation(format!("failed to configure ssh socket: {error}")))?;
    stream
        .set_write_timeout(Some(Duration::from_secs(12)))
        .map_err(|error| BackendError::validation(format!("failed to configure ssh socket: {error}")))?;

    let mut session = SshSession::new()
        .map_err(|error| BackendError::validation(format!("failed to create ssh session: {error}")))?;
    session.set_tcp_stream(stream);
    session
        .handshake()
        .map_err(|error| BackendError::validation(format!("ssh handshake failed: {error}")))?;
    authenticate(&session, request)?;
    Ok(session)
}

fn authenticate(session: &SshSession, request: &SftpConnectionRequest) -> BackendResult<()> {
    match request.auth_method.as_deref().unwrap_or_else(|| infer_auth_method(request)) {
        "password" => authenticate_with_password(session, request)?,
        "key" => authenticate_with_private_key(session, request)?,
        "agent" => authenticate_with_agent(session, request)?,
        method => {
            return Err(BackendError::validation(format!(
                "unsupported ssh auth method: {method}"
            )))
        }
    }

    if session.authenticated() {
        Ok(())
    } else {
        Err(BackendError::credential("ssh authentication failed"))
    }
}

fn infer_auth_method(request: &SftpConnectionRequest) -> &'static str {
    if request
        .private_key_path
        .as_deref()
        .is_some_and(|value| !value.is_empty())
    {
        "key"
    } else if request
        .password
        .as_deref()
        .is_some_and(|value| !value.is_empty())
        || request.credential_ref.is_some()
    {
        "password"
    } else {
        "agent"
    }
}

fn authenticate_with_password(
    session: &SshSession,
    request: &SftpConnectionRequest,
) -> BackendResult<()> {
    let stored_password = match &request.credential_ref {
        Some(credential_ref) => credential_service::get(credential_ref.clone())?,
        None => None,
    };
    let password = request
        .password
        .as_deref()
        .filter(|value| !value.is_empty())
        .or(stored_password.as_deref())
        .ok_or_else(|| BackendError::credential("password authentication requires a password"))?;
    session
        .userauth_password(&request.username, password)
        .map_err(|error| {
            BackendError::credential(format!("ssh password authentication failed: {error}"))
        })
}

fn authenticate_with_private_key(
    session: &SshSession,
    request: &SftpConnectionRequest,
) -> BackendResult<()> {
    let private_key_path = request
        .private_key_path
        .as_deref()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            BackendError::credential("key authentication requires a private key path")
        })?;
    session
        .userauth_pubkey_file(
            &request.username,
            None,
            expand_private_key_path(private_key_path).as_path(),
            request.passphrase.as_deref(),
        )
        .map_err(|error| {
            BackendError::credential(format!("ssh key authentication failed: {error}"))
        })
}

fn authenticate_with_agent(
    session: &SshSession,
    request: &SftpConnectionRequest,
) -> BackendResult<()> {
    session.userauth_agent(&request.username).map_err(|error| {
        BackendError::credential(format!("ssh agent authentication failed: {error}"))
    })
}

fn to_entry(parent_path: &str, entry_path: &Path, stat: FileStat) -> Option<SftpEntry> {
    let name = entry_path.file_name()?.to_string_lossy().to_string();
    if name == "." || name == ".." {
        return None;
    }

    Some(SftpEntry {
        path: join_remote_path(parent_path, &name),
        name,
        is_directory: stat.is_dir(),
        size_bytes: stat.size.unwrap_or(0),
        modified: stat.mtime,
    })
}

fn join_remote_path(parent_path: &str, name: &str) -> String {
    if parent_path == "/" {
        format!("/{name}")
    } else {
        format!("{}/{}", parent_path.trim_end_matches('/'), name)
    }
}

fn expand_private_key_path(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = home_dir() {
            return home.join(rest);
        }
    }
    PathBuf::from(path)
}

fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("USERPROFILE").map(PathBuf::from))
}

fn validate_connection(connection: &SftpConnectionRequest) -> BackendResult<()> {
    if connection.host.trim().is_empty() {
        return Err(BackendError::validation("host is required"));
    }
    if connection.username.trim().is_empty() {
        return Err(BackendError::validation("username is required"));
    }
    if connection.port == 0 {
        return Err(BackendError::validation("port must be greater than zero"));
    }
    Ok(())
}
