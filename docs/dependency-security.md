# Dependency Security

VRShell uses Dependabot for dependency update PRs and keeps security remediation separate from normal feature work.

## Automation

- `/.github/dependabot.yml` checks npm packages in `frontend/`, Cargo crates in `src-tauri/`, and GitHub Actions weekly.
- Minor and patch updates are grouped per ecosystem to reduce PR noise.
- Major updates should stay as separate PRs and include manual smoke testing notes.

## npm audit workflow

The root `.npmrc` disables automatic install-time audit/funding noise; explicit audit scripts are used for CI and triage.

Run audit checks from a clean dependency tree:

```powershell
npm.cmd --prefix frontend ci
npm.cmd run audit:frontend
```

`npm.cmd run audit:frontend` wraps `npm.cmd --prefix frontend audit --json` and prints a compact severity/package summary for triage. The current Vite/Vitest/vue-tsc dependency set audits cleanly with npm after the Vite 8 / Vitest 4 / vue-tsc 3 upgrade.

Before running `npm audit fix`, evaluate the proposed changes:

```powershell
npm.cmd --prefix frontend audit fix --dry-run
```

Apply fixes only in a dedicated PR when the dry run is understood. After applying fixes, run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:frontend
npm.cmd run build
npm.cmd run test:e2e:smoke
```

Use `npm audit fix --force` only when the breaking upgrade impact is reviewed and covered by a migration note.

## Cargo audit

Rust dependency advisories are checked with `cargo-audit` in CI. For local runs, install it once:

```powershell
cargo install cargo-audit --locked
```

Then run:

```powershell
npm.cmd run rust:audit
```

Use `npm.cmd run security:audit` to run both frontend npm audit summary and Rust advisory checks.
