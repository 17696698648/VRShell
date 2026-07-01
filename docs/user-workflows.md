# User Workflows

This guide covers the main VRShell workflows for new users.

## Connect to SSH

1. Open VRShell and choose **New session**.
2. Enter a session name, host, port, and username.
3. Choose an authentication method:
   - **SSH agent**: uses keys already loaded in your local agent.
   - **Password**: stores the saved password in the OS keyring after saving.
   - **Private key**: sends the key path and optional passphrase to the SSH backend for the connection.
4. Save or connect. Connection errors distinguish invalid fields, authentication failure, network failure, and host-key warnings.

## Verify Host Keys

- Unknown host keys show a confirmation dialog with the key type and fingerprint.
- Accept an unknown host only after comparing the fingerprint with a trusted source.
- Reject if you are unsure, using an untrusted network, or cannot verify the fingerprint out-of-band.
- Changed host keys are treated as a security warning. Do not connect until you confirm the server identity and the expected new fingerprint with an administrator.
- Use **Open known_hosts** from the host-key dialog to inspect or remove stale entries after confirming the right key.
- VRShell uses the platform `known_hosts` file path reported in the host-key/settings workflow.

## Transfer Files with SFTP

1. Connect an SSH session.
2. Open the **SFTP** panel.
3. Use the toolbar or context menu to refresh, create folders/files, upload, download, rename, or delete.
4. Long-running upload/download actions appear in the task queue with progress, failure details, and trace IDs.
5. If an action fails, keep the task visible while checking credentials, permissions, paths, or network reachability.

## Terminal Shortcuts

- **Enter** in the session tree connects the selected session.
- **Double-click** a session to connect it.
- **Ctrl+F** opens terminal search for the active terminal.
- **Escape** closes terminal search or dismisses active overlays where supported.
- Use terminal tab context menus to reconnect, search, close one tab, close others, or close all.

## Troubleshooting

For a focused recovery guide, see `docs/troubleshooting.md`.

- **Invalid input**: check host, port, username, and selected authentication method.
- **Authentication failed**: verify password, key path, passphrase, SSH agent, and saved keyring credentials.
- **Unknown host key**: compare the fingerprint before accepting.
- **Host key changed**: stop and verify the server with an administrator.
- **Network failure**: check DNS, VPN, firewall rules, server reachability, and SSH port.
- **SFTP permission denied**: verify remote path permissions and whether the account can read/write that directory.
- **Workspace recovery message**: VRShell ignored corrupt or stale persisted UI state and kept a local backup.

## Local Checks

Run these from the repository root before sharing changes:

```powershell
npm.cmd run check:json
npm.cmd run check:utf8
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:frontend
```

For release-sensitive changes, also run:

```powershell
npm.cmd run check:tauri-release
npm.cmd run test:e2e:smoke
```
