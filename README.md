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
- `frontend/src/components/TerminalComponent.vue` - xterm.js terminal and SSH IPC integration
- `frontend/src/components/SftpPanel.vue` - SFTP browser and transfer UI
- `frontend/src/composables/useSessions.ts` - session tree state
- `src-tauri/src/main.rs` - Rust backend with SSH, SFTP, keyring, and session commands

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
- `docs/testing.md` - local lint, typecheck, unit, E2E smoke, build, and Rust check workflow
- `docs/dependency-security.md` - Dependabot and audit remediation workflow
- `docs/release-checklist.md` - release readiness, signing, DevTools, SSH `known_hosts`, credentials, and rollback checklist
