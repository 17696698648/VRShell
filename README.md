# VRShell - Tauri SSH Terminal

This repository contains a Tauri desktop app with a Vue 3 + TypeScript frontend using xterm.js, plus a Rust backend for SSH, SFTP, session persistence, and keyring integration.

WARNING: This project is still in early development and is not fully production hardened. Be careful when connecting to untrusted servers or storing credentials.

Security notes
- Release builds disable Tauri DevTools by default.
- SSH/SFTP host keys are verified with `~/.ssh/known_hosts`; unknown hosts should be accepted only after checking the fingerprint.
- Password authentication is supported, but SFTP operations reuse an established backend session after the first successful call to reduce repeated password transfer over IPC.
- Private key authentication supports a local key path and optional passphrase. Keep private keys protected with filesystem permissions.
- Avoid storing production credentials in shared development machines until credential storage and migration policies are reviewed for your environment.

Authentication methods
- Password: provide username and password.
- Private key: choose or type a private key path, and optionally provide a passphrase.
- SSH agent: leave password and key empty to use the local SSH agent when available.

User workflows
- `docs/user-workflows.md` explains first connection setup, host-key verification, SFTP operations, terminal shortcuts, and local validation commands.
- `docs/troubleshooting.md` provides focused recovery steps for connection, host-key, SFTP, terminal, and workspace issues.

Prerequisites
- Node.js 20+ and npm 10+ (`.nvmrc` pins Node 20; CI uses Node.js 20)
- Rust toolchain (stable)
- `cargo` and `npm` in PATH
- Tauri dependencies (see Tauri docs for platform-specific requirements)

Quick start (Windows PowerShell):

```powershell
cd VRShell/frontend
npm.cmd install
# start frontend dev server only
npm.cmd run dev
# or run the full desktop app
npm.cmd run tauri
```

Build for release:

```powershell
# from frontend directory
npm.cmd run build
npm.cmd run tauri:build
```

Files of interest:
- `frontend/src/widgets/session-workbench/ui/SessionTerminalPane.vue` - terminal pane wiring and xterm.js host UI
- `frontend/src/widgets/sftp-explorer/ui/SftpFileList.vue` - SFTP file list widget
- `frontend/src/entities/session/model/sessionTree.ts` - session tree state helpers
- `frontend/src/shared/ipc/ipcFacade.ts` - typed frontend facade for Tauri IPC commands
- `src-tauri/src/services/terminal_service.rs` - SSH terminal lifecycle, output events, and PTY operations
- `src-tauri/src/services/sftp_service.rs` - SFTP connection reuse, listing, and file operations
- `src-tauri/src/ipc/contract.rs` - backend IPC contract used by generated frontend checks

Useful root scripts:
- `npm.cmd run dev` - start the Vite frontend
- `npm.cmd run lint` - run Biome lint/style checks for the frontend
- `npm.cmd run format:check` - check frontend formatting without writing changes
- `npm.cmd run typecheck` - run Vue/TypeScript checking
- `npm.cmd run test:frontend` - run frontend unit tests
- `npm.cmd run test:e2e:smoke` - run Playwright smoke coverage for startup, command palette, session dialog, SFTP drawer, and theme switching
- `npm.cmd run build` - build the frontend
- `npm.cmd run rust:test` - run Rust unit tests
- `npm.cmd run check` - run JSON/UTF-8 checks, frontend lint/typecheck/tests, Rust check/tests/clippy
- `npm.cmd run tauri:dev` - run the Tauri desktop app in development
- `npm.cmd run tauri:build` - build the desktop bundle

Project operations:
- `docs/architecture.md` - frontend/backend layering, IPC contract, and security boundaries
- `docs/adr/` - architecture decision records for release security, terminal/SFTP runtime ownership, and host-key policy
- `docs/testing.md` - local lint, typecheck, unit, E2E smoke, build, and Rust check workflow
- `docs/user-workflows.md` - user-facing connection, host-key, SFTP, terminal shortcut, and troubleshooting guide
- `docs/troubleshooting.md` - common failure symptoms and recovery steps
- `docs/contributor-checklist.md` - required checks by change type
- `docs/optimization-task-plan.md` - ordered application improvement backlog for “按照文档任务依次执行”
- `docs/dependency-security.md` - Dependabot and audit remediation workflow
- `docs/release-checklist.md` - release readiness, signing, DevTools, SSH `known_hosts`, credentials, and rollback checklist
