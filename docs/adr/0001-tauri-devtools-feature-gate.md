# ADR 0001: Gate Tauri DevTools Behind an Explicit Feature

## Status

Accepted

## Context

VRShell is a desktop SSH/SFTP client. Development builds benefit from Tauri DevTools, but release builds should avoid exposing debugging capabilities by default.

## Decision

DevTools are enabled only through the Cargo feature `devtools`. The default feature set remains empty, and `frontend/package.json` enables `--features devtools` only for `tauri:dev`.

`npm.cmd run check:tauri-release` verifies that release build scripts do not enable this feature.

## Consequences

- Development keeps DevTools available through the normal dev command.
- Release builds have a guardrail against accidental DevTools enablement.
- Any future build script that enables Cargo features must be reviewed against this policy.
