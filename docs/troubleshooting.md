# Troubleshooting

Use this guide when a connection, file transfer, terminal, or workspace restore does not behave as expected.

## Connection Issues

- **Invalid input**: confirm host, port, username, and authentication type in the session form.
- **Network failure**: check DNS, VPN, firewall rules, server reachability, and the SSH port.
- **Authentication failed**: verify the password, private key path, passphrase, SSH agent, and any saved keyring credential.
- **Reconnect required**: use the terminal tab or SFTP panel **Reconnect** action, then retry terminal input or SFTP operations.

## Host-Key Prompts

- **Unknown host key**: compare the fingerprint with trusted server documentation before accepting.
- **Changed host key**: stop and confirm the server identity with an administrator before editing `known_hosts` or reconnecting.
- **Stale known_hosts entry**: use **Open known_hosts** from the host-key dialog, remove only the confirmed stale entry, then reconnect.

## SFTP Issues

- **Permission denied**: verify remote directory permissions and whether the account can read or write the target path.
- **Upload/download failed**: open the task queue, inspect the trace ID and error, then use retry after fixing credentials, paths, or connectivity.
- **Large directory feels slow**: switch sorting only when needed and load additional pages incrementally.
- **SFTP says disconnected**: reconnect the session terminal first; SFTP reuses the active backend SSH session.

## Terminal Issues

- **No output**: check whether the tab status is connected, reconnect if needed, and inspect local logs for terminal lifecycle summaries.
- **Input queued**: reconnect the terminal; queued input is flushed after a successful reconnect.
- **Resize or keepalive failure**: reconnect the terminal and check network/VPN stability.

## Workspace Recovery

- **Recovered layout message**: VRShell ignored corrupt or unsupported UI state, kept a backup in local storage, and started with safe defaults.
- **Missing active session after restore**: reconnect from the session explorer; stale backend session IDs are intentionally discarded on startup.
- **Unexpected panel layout**: use workspace reset or switch panels manually, then persist state by closing normally.

## Collect Diagnostics

- Open the logs panel and copy relevant summaries. Diagnostic output redacts passwords, tokens, private keys, PEM blocks, and local user paths.
- Include task trace IDs when reporting SFTP or background-task failures.
