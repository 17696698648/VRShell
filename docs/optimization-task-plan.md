# VRShell Optimization Task Plan

This document is the ordered execution backlog for improving VRShell. When the user says “按照文档任务依次执行”, start from the first unchecked task, complete one focused task at a time, update the checkbox/status here, and run the validation listed for that task before moving on.

## Execution Rules

- Work strictly from top to bottom unless a task is blocked by missing requirements.
- Keep each change small and reviewable; do not combine unrelated tasks in one patch.
- Before editing, check `git status --short` and avoid overwriting user changes.
- Follow existing architecture boundaries in `docs/architecture.md`.
- Prefer shared UI, error, task, diagnostics, and IPC primitives over adding local one-off code.
- After each task, update this document with the result, changed files, and validation command outcomes.

## Validation Baseline

Use the narrowest relevant checks for each task first, then broaden only when needed.

- Frontend architecture/UI changes: `npm.cmd run lint`, `npm.cmd run typecheck`, and targeted `npm.cmd run test:frontend`.
- IPC contract changes: `npm.cmd run generate:ipc`, `npm.cmd run check:ipc`, and affected frontend/Rust tests.
- Backend changes: `npm.cmd run rust:fmt`, `npm.cmd run rust:check`, `npm.cmd run rust:test`, and `npm.cmd run rust:clippy`.
- Release-sensitive changes: `npm.cmd run check:tauri-release`, `npm.cmd run check`, and, when UI startup behavior changes, `npm.cmd run test:e2e:smoke`.
- Documentation-only changes: manual review plus `npm.cmd run check:json` and `npm.cmd run check:utf8`.

## Ordered Tasks

### 1. Run Full Regression and Stabilize Baseline

- [x] Run a full regression pass after the recent connection, SFTP, terminal, dialog, diagnostics, and permission changes.
- Scope: `npm.cmd run check`, `npm.cmd run test:e2e:smoke`, known flaky tests, and any failure triage.
- Expected result: current main workflows have a clean validation baseline before more feature work starts.
- Validation: `npm.cmd run check`; `npm.cmd run test:e2e:smoke`.

Result: Completed on 2026-07-02.
Changed files: `docs/optimization-task-plan.md`.
Validation: `npm.cmd run check` passed; `npm.cmd run test:e2e:smoke` passed.
Follow-up: Continue with working-tree organization in task 2.

### 2. Organize Current Changes into Reviewable Groups

- [x] Audit the current working tree and group changes by feature area.
- Scope: connection UX, SFTP task reliability, terminal lifecycle, workspace recovery, architecture guards, accessibility, diagnostics, Tauri release checks, documentation, and unrelated/deleted files.
- Expected result: a clear commit/review plan with accidental deletes or unrelated changes identified before submission.
- Validation: `git status --short`; manual diff review; no code validation required unless files are changed.

Result: Completed on 2026-07-02.
Changed files: `docs/change-review-plan.md`, `docs/optimization-task-plan.md`.
Validation: `git status --short` reviewed; current changes grouped in `docs/change-review-plan.md`; `docs/backlog.md` and `docs/engineering-improvements.md` flagged for confirmation; `npm.cmd run check:utf8` passed.
Follow-up: Continue with deleted documentation confirmation in task 3.

### 3. Confirm Removed Documents Are Intentional

- [x] Review deleted docs and restore or replace them if they still contain useful planning context.
- Scope: previously removed `docs/backlog.md`, `docs/engineering-improvements.md`, and any references to those files.
- Expected result: documentation navigation remains complete and no useful project context is accidentally lost.
- Validation: `npm.cmd run check:utf8`; manual docs review.

Result: Completed on 2026-07-02.
Changed files: `docs/backlog.md`, `docs/engineering-improvements.md`, `docs/change-review-plan.md`, `docs/optimization-task-plan.md`.
Validation: historical docs reviewed and restored; `git restore --staged docs/backlog.md docs/engineering-improvements.md` removed accidental staged deletes; `npm.cmd run check:utf8` passed.
Follow-up: Continue with session dialog regression coverage in task 4.

### 4. Expand Session Dialog Regression Coverage

- [x] Strengthen tests around creating, editing, cancelling, saving, and testing SSH sessions.
- Scope: session explorer toolbar actions, context menu edit flow, dialog Teleport/layering, `SessionForm`, `SessionCreateForm`, `SessionEditDialog`, and Playwright smoke coverage.
- Expected result: new/edit session dialogs cannot regress due to z-index, stacking context, hover-only toolbar actions, or form state changes.
- Validation: `npm.cmd --prefix frontend run test -- src/widgets/session-explorer src/features/session`; `npm.cmd --prefix frontend run test:e2e:smoke -- --grep "session"`; `npm.cmd run lint`; `npm.cmd run typecheck`.

Result: Completed on 2026-07-02.
Changed files: `frontend/src/widgets/session-explorer/ui/__tests__/SessionCreateForm.test.ts`, `frontend/src/widgets/session-explorer/ui/__tests__/SessionForm.test.ts`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd --prefix frontend run test -- src/widgets/session-explorer src/features/session` passed; `cd frontend; npx.cmd playwright test --project=chromium e2e/smoke.spec.ts --grep "opens session"` passed; `npm.cmd run typecheck` passed; `npm.cmd run lint` passed. Note: broad `--grep session` also matched visual snapshots and reported expected visual diffs from the intentional dialog/toolbar UI changes, so the scoped smoke file command was used for functional regression coverage.
Follow-up: Continue with centralized SSH connection error UI policy in task 5.

### 5. Centralize SSH Connection Error UI Policy

- [x] Replace feature-local connection error categorization with a shared error display policy table.
- Scope: `connectionFailure`, `IpcError`, `notifyAppError`, host-key handling, terminal/SFTP connection failures, and backend error codes.
- Expected result: frontend UI relies on stable `code`, `kind`, `recoverable`, and `source` fields instead of duplicated string checks.
- Validation: `npm.cmd --prefix frontend run test -- src/shared/ipc src/shared/feedback src/features/session/connect-session`; `npm.cmd run typecheck`; `npm.cmd run lint`.

Result: Completed on 2026-07-02.
Changed files: `frontend/src/shared/error/errorDisplayPolicy.ts`, `frontend/src/shared/error/__tests__/errorDisplayPolicy.test.ts`, `frontend/src/features/session/connect-session/connectionFailure.ts`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd --prefix frontend run test -- src/shared/ipc src/shared/feedback src/shared/error src/features/session/connect-session` passed; `npm.cmd run typecheck` passed; `npm.cmd run lint` passed.
Follow-up: Continue with SFTP retry support in task 6.

### 6. Add SFTP Retry Support from Task Context

- [x] Add retry actions for failed SFTP tasks using stored retry context.
- Scope: upload, download, delete, mkdir, rename, refresh, task queue UI, cancellation state, and per-path duplicate guards.
- Expected result: failed SFTP operations remain visible and can be retried safely without losing path/action context.
- Validation: SFTP feature/widget tests; task center tests; `npm.cmd run typecheck`; `npm.cmd run lint`.

Result: Completed on 2026-07-02.
Changed files: `frontend/src/features/sftp/manage-files/manageSftpFiles.ts`, `frontend/src/features/task/manage-task/manageTask.ts`, `frontend/src/features/task/manage-task/__tests__/manageTask.test.ts`, `frontend/src/widgets/task-center/ui/TaskListItem.vue`, `frontend/src/widgets/task-center/ui/__tests__/TaskListItem.test.ts`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd --prefix frontend run test -- src/features/task src/features/sftp src/widgets/task-center` passed; `npm.cmd run typecheck` passed; `npm.cmd run lint` passed.
Follow-up: Continue with disconnected and reconnect UX in task 7.

### 7. Unify Disconnected and Reconnect UX

- [x] Standardize disconnected-session handling across terminal and SFTP workflows.
- Scope: terminal reconnect, SFTP reconnect-required states, stale backend session IDs, terminal tab tooltips, and user-facing recovery actions.
- Expected result: users see one clear reconnect path when terminal or SFTP resources become stale.
- Validation: terminal lifecycle tests; SFTP explorer tests; targeted smoke if UI flow changes; `npm.cmd run rust:test` if backend lifecycle changes.

Result: Completed on 2026-07-02.
Changed files: `frontend/src/app/lifecycle/createAppCommands.ts`, `frontend/src/app/lifecycle/__tests__/createAppCommands.test.ts`, `frontend/src/shared/copy/reconnectMessages.ts`, `frontend/src/widgets/session-workbench/ui/SessionTerminalPane.vue`, `frontend/src/widgets/session-workbench/ui/SessionTerminalTabs.vue`, `frontend/src/widgets/sftp-explorer/ui/SftpExplorer.vue`, `frontend/src/widgets/sftp-explorer/ui/__tests__/SftpExplorer.test.ts`, `frontend/src/widgets/sftp-explorer/model/__tests__/useSftpExplorer.test.ts`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd --prefix frontend run test -- src/features/terminal/manage-connection src/features/terminal/events src/widgets/sftp-explorer src/app/lifecycle` passed; `npm.cmd run typecheck` passed; `npm.cmd run lint` passed; `npm.cmd run rust:test` not run because no backend lifecycle code changed.
Follow-up: Continue with shared secret and path redaction in task 8.

### 8. Harden Secret and Path Redaction as a Shared Primitive

- [x] Consolidate sensitive text redaction into one shared implementation.
- Scope: `sanitizeSensitiveText`, diagnostics redaction, IPC/backend error sanitization rules, passwords, passphrases, tokens, private keys, local user paths, and PEM blocks.
- Expected result: diagnostics, toasts, logs, and backend errors use consistent redaction rules with tests for common secret formats.
- Validation: redaction unit tests; diagnostics tests; security E2E when output changes; Rust tests if backend sanitizer changes.

Result: Completed on 2026-07-02.
Changed files: `frontend/src/shared/lib/sanitizeSensitiveText.ts`, `frontend/src/shared/lib/__tests__/sanitizeSensitiveText.test.ts`, `frontend/src/shared/diagnostics/diagnosticBundle.ts`, `src-tauri/src/error.rs`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd --prefix frontend run test -- src/shared/lib src/shared/diagnostics src/shared/ipc src/features/session/connect-session` passed; `npm.cmd run rust:fmt` passed; `npm.cmd run rust:check` passed; `npm.cmd run rust:test` passed; `npm.cmd run typecheck` passed; `npm.cmd run lint` passed; `npm.cmd run rust:clippy` passed; IDE build check passed.
Follow-up: Continue with first-run and connection onboarding in task 9.

### 9. Improve First-Run and Connection Onboarding

- [x] Add lightweight first-run guidance for creating a session, choosing auth, verifying host keys, and opening SFTP.
- Scope: welcome page, session creation copy, host-key explanation, links to `docs/user-workflows.md`, and non-intrusive dismiss state.
- Expected result: a new user can complete first connection and understand host-key trust without reading implementation docs.
- Validation: welcome/session component tests; Playwright smoke coverage; `npm.cmd run lint`; `npm.cmd run typecheck`.

Result: Completed on 2026-07-02.
Changed files: `frontend/src/pages/welcome/WelcomePage.vue`, `frontend/src/pages/welcome/__tests__/WelcomePage.test.ts`, `frontend/src/widgets/session-explorer/ui/SessionForm.vue`, `frontend/src/widgets/session-explorer/ui/__tests__/SessionForm.test.ts`, `frontend/src/widgets/styles/widgets.css`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd --prefix frontend run test -- src/pages/welcome src/widgets/session-explorer/ui` passed; `npm.cmd run test:e2e:smoke` passed; `npm.cmd run lint` passed; `npm.cmd run typecheck` passed.
Follow-up: Continue with host-key verification help and safety copy in task 10.

### 10. Add Host-Key Verification Help and Safety Copy

- [x] Improve user-facing host-key verification guidance.
- Scope: unknown host-key dialog, changed host-key warning, known_hosts path actions, troubleshooting docs, and in-app explanatory copy.
- Expected result: users understand when to accept, reject, or stop on host-key prompts and changed-key warnings.
- Validation: host-key UI tests; security E2E; docs review; `npm.cmd run check:utf8`.

Result: Completed on 2026-07-02.
Changed files: `frontend/src/shell/overlays/HostKeyDialogHost.vue`, `frontend/src/shell/overlays/__tests__/HostKeyDialogHost.test.ts`, `frontend/e2e/security.spec.ts`, `docs/user-workflows.md`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd --prefix frontend run test -- src/shell/overlays src/features/session/connect-session` passed; `npm.cmd --prefix frontend run test:e2e:security` passed; `npm.cmd run check:utf8` passed; `npm.cmd run typecheck` passed; `npm.cmd run lint` passed.
Follow-up: Continue with large SFTP and task-list profiling in task 11.

### 11. Profile Large SFTP and Task Lists

- [x] Add profiling notes and targeted optimizations for large SFTP directories and active task queues.
- Scope: SFTP virtualized list, sort helpers, task center updates, progress event batching, and 5k/10k-item manual profiling notes.
- Expected result: large lists stay responsive and frequent task updates avoid unnecessary re-renders.
- Validation: targeted unit tests; manual profiling notes appended to this document; `npm.cmd run typecheck`; `npm.cmd run lint`.

Result: Completed on 2026-07-02.
Changed files: `frontend/src/widgets/sftp-explorer/model/sortSftpItems.ts`, `frontend/src/entities/task/model/task.store.ts`, `frontend/src/entities/task/model/__tests__/task.store.test.ts`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd --prefix frontend run test -- src/entities/task src/features/task src/widgets/sftp-explorer` passed; `npm.cmd run typecheck` passed; `npm.cmd run lint` passed.
Profiling notes: SFTP sorting now reuses one natural `Intl.Collator` instead of allocating collator options during each comparison, which is the hot path for 5k/10k-item resorting. Task updates now use an id index with stale-index recovery, avoiding repeated linear scans during frequent progress updates while preserving compatibility with tests and direct array resets.
Follow-up: Continue with terminal output observability in task 12.

### 12. Improve Terminal Output Observability

- [x] Add local diagnostics for terminal output batching and connection lifecycle without logging secrets.
- Scope: output flush batch size, poll/event mode, reconnect attempts, stale runtime ignores, and failure trace IDs.
- Expected result: terminal bugs can be diagnosed from safe local summaries without exposing command output secrets by default.
- Validation: terminal event/provider tests; diagnostics tests; security redaction tests.

Result: Completed on 2026-07-02.
Changed files: `frontend/src/features/terminal/events/terminalEventProvider.ts`, `frontend/src/features/terminal/events/__tests__/terminalEventProvider.test.ts`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd --prefix frontend run test -- src/features/terminal/events src/shared/diagnostics src/shared/lib` passed; `npm.cmd run typecheck` passed; `npm.cmd run lint` passed.
Follow-up: Continue with separately versioned persisted workspace substates in task 13.

### 13. Version Persisted Workspace Substates Separately

- [x] Add finer-grained schema/version handling for workspace layout, session tree, open panes, and SFTP state.
- Scope: persistence migration, backup/recovery messages, safe defaults, stale pane/session cleanup, and migration tests.
- Expected result: corrupt or stale data in one area does not force all UI state to be discarded.
- Validation: persistence tests; workspace model tests; `npm.cmd run test:e2e:smoke` if startup behavior changes.

Result: Completed on 2026-07-02.
Changed files: `frontend/src/app/lifecycle/persistence.ts`, `frontend/src/app/lifecycle/__tests__/persistence.test.ts`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd --prefix frontend run test -- src/app/lifecycle src/entities/workspace` passed; `npm.cmd run typecheck` passed; `npm.cmd run lint` passed; `npm.cmd run test:e2e:smoke` passed.
Follow-up: Continue with Tauri permission guardrails in task 14.

### 14. Extend Tauri Permission Guardrails

- [x] Expand release checks with explicit forbidden permission detection.
- Scope: filesystem, shell, updater, extra windows, dialog permissions, DevTools feature gate, and release checklist documentation.
- Expected result: accidental permission expansion fails release checks unless documented and intentionally allowed.
- Validation: `npm.cmd run check:tauri-release`; `npm.cmd run rust:check`; docs review.

Result: Completed on 2026-07-02.
Changed files: `scripts/check-tauri-release-config.mjs`, `docs/release-checklist.md`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd run check:tauri-release` passed; `npm.cmd run rust:check` passed; `npm.cmd run check:utf8` passed.
Follow-up: Continue with troubleshooting documentation in task 15.

### 15. Add Troubleshooting Documentation Page

- [x] Create a dedicated troubleshooting guide for common connection, host-key, SFTP, terminal, and workspace recovery issues.
- Scope: `docs/troubleshooting.md`, README links, user workflows links, and concise remediation steps.
- Expected result: users can recover from common failures without reading developer architecture docs.
- Validation: manual docs review; `npm.cmd run check:json`; `npm.cmd run check:utf8`.

Result: Completed on 2026-07-02.
Changed files: `docs/troubleshooting.md`, `README.md`, `docs/user-workflows.md`, `docs/optimization-task-plan.md`.
Validation: manual docs review completed; `npm.cmd run check:json` passed; `npm.cmd run check:utf8` passed.
Follow-up: Continue with contributor change checklist in task 16.

### 16. Add Contributor Change Checklist

- [x] Document required checks by change type for future contributors.
- Scope: IPC changes, Tauri capability changes, SFTP task changes, terminal lifecycle changes, diagnostics/redaction changes, and docs-only changes.
- Expected result: contributors know which commands to run before submitting each type of change.
- Validation: docs review; `npm.cmd run check:utf8`.

Result: Completed on 2026-07-02.
Changed files: `docs/contributor-checklist.md`, `README.md`, `docs/optimization-task-plan.md`.
Validation: docs review completed; `npm.cmd run check:utf8` passed.
Follow-up: Continue with focused CI validation jobs in task 17.

### 17. Split CI into Focused Validation Jobs

- [x] Propose or implement CI jobs for quick, frontend, Rust, E2E, and release-sensitive checks.
- Scope: package scripts, existing CI config if present, docs/testing updates, and job dependency order.
- Expected result: routine changes get fast feedback while release-critical paths still run full validation.
- Validation: script dry runs where practical; docs review; `npm.cmd run check:json`; `npm.cmd run check:utf8`.

Result: Completed on 2026-07-02.
Changed files: `.github/workflows/check.yml`, `package.json`, `docs/testing.md`, `docs/optimization-task-plan.md`.
Validation: `npm.cmd run check:json` passed; `npm.cmd run check:utf8` passed; `npm.cmd run check:tauri-release` passed; CI job changes reviewed manually.
Follow-up: None; ordered optimization backlog is complete.

## Task Completion Template

When completing a task, append a short note under that task using this format:

```markdown
Result: Completed on YYYY-MM-DD.
Changed files: `path/to/file`, `path/to/test`.
Validation: `command` passed; `command` not run because <reason>.
Follow-up: <optional next issue or none>.
```

## Current Priority Notes

- Start with regression and working-tree organization because recent changes touched many core workflows.
- Do not broaden feature work until session dialog, connection, SFTP, terminal, persistence, and release checks have a clean baseline.
- Keep security-sensitive work separate from UX polish so credentials, host keys, and diagnostics remain easy to review.
