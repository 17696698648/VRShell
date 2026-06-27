# Testing Workflow

Run checks from the repository root unless a command says otherwise.

## Fast Local Checks

```powershell
npm.cmd run check:ipc
npm.cmd run check:json
npm.cmd run check:utf8
npm.cmd run check:tauri-release
npm.cmd run lint
npm.cmd run typecheck
```

Use these before committing frontend, IPC, config, or documentation changes.

## Frontend Checks

```powershell
npm.cmd run test:frontend
npm.cmd run build
```

Run `npm.cmd run test:e2e:smoke` when changing workbench startup, command palette, session dialogs, SFTP drawer behavior, or theme switching.

## Rust Checks

```powershell
npm.cmd run rust:fmt
npm.cmd run rust:check
npm.cmd run rust:test
npm.cmd run rust:clippy
```

Run the Rust checks when changing `src-tauri/**`, IPC DTOs, SSH/SFTP behavior, state handling, or Tauri capabilities.

## Full Check

```powershell
npm.cmd run check
```

The full check runs generated IPC validation, JSON/UTF-8 checks, the Tauri release security guard, frontend guard/lint/typecheck/tests, and Rust check/test/clippy.

## Release Check

```powershell
npm.cmd run release:check
```

The release check runs the full check, production frontend build, and Playwright smoke coverage. Use it for release candidates and dependency PRs that affect runtime behavior.

## Notes

- On Windows PowerShell, prefer `npm.cmd` over `npm` if script execution policy blocks `npm.ps1`.
- Run `cargo check --manifest-path src-tauri/Cargo.toml --features devtools` after changing Tauri feature flags.
- E2E tests require Playwright browsers. Install Chromium with `npx --prefix frontend playwright install chromium` if needed.
