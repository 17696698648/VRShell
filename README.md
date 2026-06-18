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
- Node.js (18+ recommended)
- Rust toolchain (stable)
- `cargo` and `npm` in PATH
- Tauri dependencies (see Tauri docs for platform-specific requirements)

Quick start (Windows PowerShell):

```powershell
cd F:/git-project/VRShell/frontend
npm install
# start frontend dev server only
npm run dev
# or run the full desktop app
npm run tauri
```

Build for release:

```powershell
# from frontend directory
npm run build
npm run tauri:build
```

Files of interest:
- `frontend/src/components/TerminalComponent.vue` - xterm.js terminal and SSH IPC integration
- `frontend/src/components/SftpPanel.vue` - SFTP browser and transfer UI
- `frontend/src/composables/useSessions.ts` - session tree state
- `src-tauri/src/main.rs` - Rust backend with SSH, SFTP, keyring, and session commands

Useful root scripts:
- `npm run dev` - start the Vite frontend
- `npm run typecheck` - run Vue/TypeScript checking
- `npm run build` - build the frontend
- `npm run rust:test` - run Rust unit tests
- `npm run check` - run JSON/UTF-8 checks, frontend typecheck, Rust check/tests/clippy
- `npm run tauri:dev` - run the Tauri desktop app in development
- `npm run tauri:build` - build the desktop bundle
