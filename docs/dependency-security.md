# Dependency Security

VRShell uses npm dependencies for the Vue/Tauri frontend and Cargo dependencies for the Rust backend.

## Automated Updates

Dependabot is configured in `.github/dependabot.yml` for:

- npm dependencies in `frontend/`
- Cargo dependencies in `src-tauri/`
- GitHub Actions in `.github/workflows/`

Minor and patch updates are grouped by ecosystem to reduce review noise.

## Audit Commands

```powershell
npm.cmd run audit:frontend
npm.cmd run rust:audit
npm.cmd run security:audit
```

Use `security:audit` before a release or after dependency updates. `rust:audit` requires `cargo-audit` to be installed locally.

## Review Policy

- Treat Tauri, SSH, keyring, terminal, and filesystem dependencies as high-risk updates.
- Prefer small dependency PRs for major updates, especially `@tauri-apps/*`, `tauri`, `ssh2`, `keyring`, `vite`, `@xterm/*`, and CodeMirror packages.
- Require `npm.cmd run check` for dependency PRs that affect runtime code.
- Require `npm.cmd run test:e2e:smoke` when frontend framework, Tauri API, terminal UI, or Playwright dependencies change.

## Remediation Steps

1. Reproduce the advisory with `npm.cmd run security:audit`.
2. Check whether the vulnerable package is used in production code, build tooling, or tests only.
3. Prefer a direct patch/minor update when available.
4. For transitive npm issues, update the parent package or use `npm audit fix` only after reviewing lockfile changes.
5. For Cargo issues, update `Cargo.toml` and `Cargo.lock`, then run Rust check/test/clippy.
6. Document any accepted risk in the release notes until it is remediated.
