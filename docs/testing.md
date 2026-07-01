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

## Playwright E2E

Run Playwright from the frontend package:

```powershell
npm.cmd --prefix frontend run test:e2e
npm.cmd --prefix frontend run test:e2e:smoke
npm.cmd --prefix frontend run test:e2e:security
npm.cmd --prefix frontend run test:e2e:visual
```

Use `test:e2e:security` for host key, cancellation, and sensitive-message regression checks. Use `test:e2e:visual` for snapshot gates only.

When a PR intentionally changes UI baselines, update snapshots with:

```powershell
npm.cmd --prefix frontend run test:e2e:visual -- --update-snapshots
```

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

## CI Jobs

- **Fast checks**: generated IPC, JSON/UTF-8, Tauri release guard, frontend architecture guard, and lint.
- **Frontend test/build**: frontend audit, typecheck, unit tests, and production build on Windows plus Linux compatibility coverage.
- **Rust check/test/clippy**: Rust formatting, check, tests, clippy, and audit.
- **E2E smoke/security**: Playwright smoke and security suites run as focused jobs after frontend validation.
- **Release-sensitive checks**: Tauri permission guardrails run after frontend, Rust, and security coverage before packaging smoke.

## Release Check

```powershell
npm.cmd run release:check
```

The release check runs the full check, production frontend build, and Playwright smoke coverage. Use it for release candidates and dependency PRs that affect runtime behavior.

## Notes

- On Windows PowerShell, prefer `npm.cmd` over `npm` if script execution policy blocks `npm.ps1`.
- After changing command definitions in `src-tauri/src/ipc/contract.rs`, run `npm.cmd run generate:ipc` and commit `frontend/src/shared/ipc/generated/backendCommands.ts` in the same PR.
- Validate IPC command changes with `npm.cmd run check:ipc` before opening a PR.
- Run `cargo check --manifest-path src-tauri/Cargo.toml --features devtools` after changing Tauri feature flags.
- E2E tests require Playwright browsers. Install Chromium with `npx --prefix frontend playwright install chromium` if needed.
