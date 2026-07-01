# Change Review Plan

This file groups the current working-tree changes into reviewable batches. Use it before committing or selectively reverting changes.

## 1. Documentation and Planning

- `README.md`
- `docs/optimization-task-plan.md`
- `docs/user-workflows.md`
- `docs/release-checklist.md`

Review intent: user-facing workflows, release permission notes, and ordered follow-up backlog.

## 2. Restored Historical Planning Documents

- `docs/backlog.md`
- `docs/engineering-improvements.md`

Review intent: these files contain still-useful historical backlog and engineering-hardening context, so they were restored instead of leaving them deleted.

## 3. SSH Connection UX and Error Handling

- `frontend/src/entities/session/api/sshConnection.ts`
- `frontend/src/features/session/connect-session/connectSession.ts`
- `frontend/src/features/session/connect-session/connectionFailure.ts`
- `frontend/src/features/session/connect-session/__tests__/connectionFailure.test.ts`
- `frontend/src/features/session/connect-session/hostKeyActions.ts`
- `frontend/src/features/session/create-session/importSshConfigSessions.ts`
- `frontend/src/features/session/edit-session/renameSession.ts`
- `frontend/src/shell/overlays/HostKeyDialogHost.vue`
- `frontend/src/app/providers/ErrorBoundaryProvider.vue`

Review intent: consistent actionable SSH/host-key errors and shared connection argument mapping.

## 4. Session Dialog and Session Explorer UI

- `frontend/e2e/smoke.spec.ts`
- `frontend/src/widgets/session-explorer/model/useSessionExplorer.ts`
- `frontend/src/widgets/session-explorer/model/__tests__/useSessionExplorer.test.ts`
- `frontend/src/widgets/session-explorer/ui/SessionCreateForm.vue`
- `frontend/src/widgets/session-explorer/ui/SessionEditDialog.vue`
- `frontend/src/widgets/session-explorer/ui/SessionForm.vue`
- `frontend/src/widgets/session-explorer/ui/__tests__/SessionEditDialog.test.ts`
- `frontend/src/widgets/session-explorer/ui/session-explorer.css`

Review intent: create/edit dialog visibility, Teleport layering, draft form state, and session search performance.

## 5. SFTP Task Reliability

- `frontend/src/entities/sftp/api/sftpRepository.ts`
- `frontend/src/entities/sftp/api/__tests__/sftpRepository.test.ts`
- `frontend/src/entities/task/model/task.store.ts`
- `frontend/src/features/sftp/manage-files/manageSftpFiles.ts`
- `frontend/src/features/sftp/manage-files/sftpOperationTasks.ts`
- `frontend/src/features/sftp/manage-files/__tests__/manageSftpFiles.test.ts`
- `frontend/src/widgets/sftp-explorer/model/useSftpExplorer.ts`
- `frontend/src/widgets/sftp-explorer/model/__tests__/useSftpExplorer.test.ts`
- `frontend/src/widgets/sftp-explorer/ui/SftpFileList.vue`
- `frontend/src/widgets/sftp-explorer/ui/__tests__/SftpFileList.test.ts`

Review intent: task queue state, duplicate operation guards, failure context, and large-list sorting reuse.

## 6. Terminal Lifecycle Reliability

- `frontend/src/entities/terminal/api/terminalRepository.ts`
- `frontend/src/entities/terminal/api/__tests__/terminalRepository.test.ts`
- `frontend/src/entities/terminal/model/terminal.store.ts`
- `frontend/src/entities/terminal/model/terminal.types.ts`
- `frontend/src/features/terminal/close-terminal/closeTerminalTab.ts`
- `frontend/src/features/terminal/events/terminalEventProvider.ts`
- `frontend/src/features/terminal/events/__tests__/terminalEventProvider.test.ts`
- `frontend/src/features/terminal/manage-connection/manageTerminalConnection.ts`
- `frontend/src/features/terminal/manage-connection/__tests__/manageTerminalConnection.test.ts`
- `frontend/src/features/terminal/resize-terminal/resizeTerminal.ts`
- `frontend/src/features/terminal/send-terminal-input/sendTerminalInput.ts`
- `frontend/src/widgets/session-workbench/ui/SessionTerminalTabs.vue`

Review intent: stale runtime guards, disconnecting state, reconnect behavior, resize/send race protection, and output event handling.

## 7. Workspace Recovery and Diagnostics

- `frontend/src/app/lifecycle/persistence.ts`
- `frontend/src/app/lifecycle/__tests__/persistence.test.ts`
- `frontend/src/shared/diagnostics/diagnosticBundle.ts`
- `frontend/src/shared/diagnostics/__tests__/diagnosticBundle.test.ts`

Review intent: corrupt persisted state recovery, stale runtime cleanup, diagnostic summaries, and redaction.

## 8. IPC Contract and Backend Error Taxonomy

- `frontend/src/shared/ipc/ipcContract.ts`
- `frontend/src/shared/ipc/ipcFacade.ts`
- `frontend/src/shared/ipc/__tests__/ipcErrors.test.ts`
- `frontend/src/shared/ipc/__tests__/ipcFacade.test.ts`
- `src-tauri/src/error.rs`
- `src-tauri/src/infrastructure/ssh_auth.rs`
- `src-tauri/src/ipc/contract.rs`
- `src-tauri/src/ipc/dto.rs`
- `src-tauri/src/domain/terminal.rs`

Review intent: stable backend error codes/kinds, IPC facade alignment, and SSH auth classification.

## 9. Backend SFTP, Terminal, and Task Services

- `src-tauri/src/commands/security.rs`
- `src-tauri/src/commands/sftp.rs`
- `src-tauri/src/commands/terminal.rs`
- `src-tauri/src/services/sftp_service.rs`
- `src-tauri/src/services/task_service.rs`
- `src-tauri/src/services/terminal_service.rs`
- `src-tauri/src/services/terminal_service/events.rs`
- `src-tauri/src/state.rs`

Review intent: backend runtime ownership, terminal/SFTP lifecycle, task cancellation/listing, and IPC DTO behavior.

## 10. Architecture Guards, Permissions, and Security E2E

- `frontend/scripts/check-frontend-guards.mjs`
- `frontend/e2e/security.spec.ts`
- `scripts/check-tauri-release-config.mjs`

Review intent: frontend architecture guard expansion, release capability checks, and security flow coverage.

## 11. Accessibility and Task Center UI

- `frontend/src/widgets/task-center/ui/TaskListItem.vue`
- `frontend/src/widgets/task-center/ui/__tests__/TaskListItem.test.ts`

Review intent: shared buttons, ARIA state, task error controls, and keyboard-accessible actions.

## Suggested Commit Order

1. Documentation/planning additions and confirmed doc deletes.
2. Backend IPC/error taxonomy and generated/facade alignment.
3. SSH connection UX and session dialog fixes.
4. SFTP task reliability.
5. Terminal lifecycle reliability.
6. Workspace recovery and diagnostics.
7. Architecture guards, release checks, accessibility, and docs polish.

## Latest Validation Baseline

- `npm.cmd run check` passed on 2026-07-02.
- `npm.cmd run test:e2e:smoke` passed on 2026-07-02.
