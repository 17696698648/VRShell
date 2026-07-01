# Contributor Change Checklist

Use the narrowest checks that match your change, then run broader validation before release-sensitive work.

## Frontend UI or Architecture

- Run `npm.cmd run lint` and `npm.cmd run typecheck`.
- Run targeted frontend tests for touched widgets/features.
- Run `npm.cmd run test:e2e:smoke` when startup, dialogs, navigation, or main workflows change.

## IPC Contract Changes

- Update Rust command handlers, DTO/domain types, IPC contract, and frontend facade together.
- Run `npm.cmd run generate:ipc` and `npm.cmd run check:ipc`.
- Run affected frontend tests and Rust tests.

## Tauri Capability Changes

- Update `src-tauri/capabilities/*` and document the required workflow.
- Run `npm.cmd run check:tauri-release` and `npm.cmd run rust:check`.
- Update `docs/release-checklist.md` when permissions expand.

## SFTP Task Changes

- Cover task creation, cancellation, retry context, trace IDs, and progress updates.
- Run targeted SFTP/task tests and `npm.cmd run typecheck`.
- Run backend tests when transfer lifecycle or task persistence changes.

## Terminal Lifecycle Changes

- Cover connect, disconnect, reconnect, stale backend session IDs, resize, input queueing, and output events.
- Run terminal feature/provider tests.
- Run `npm.cmd run rust:test` when backend terminal lifecycle changes.

## Diagnostics and Redaction

- Verify passwords, passphrases, tokens, private keys, PEM blocks, and local user paths are redacted.
- Run redaction, diagnostics, IPC error, and security E2E tests when user-visible output changes.

## Documentation-Only Changes

- Run `npm.cmd run check:json` when JSON/package metadata is touched.
- Run `npm.cmd run check:utf8` for all docs-only changes.
- Keep README, user workflows, troubleshooting, and release checklist links consistent.
