# VRShell Architecture

VRShell is a Tauri desktop application with a Vue 3 frontend and a Rust backend. The frontend owns workbench state and interaction flows, while the backend owns SSH, SFTP, credential, host-key, and filesystem side effects.

## Frontend Layers

- `app/` wires application startup, providers, persistence, and command contributions.
- `shell/` contains the workbench frame: titlebar, sidebars, dock, overlays, status bar, and activity bars.
- `pages/` composes top-level screens such as welcome, settings, and workbench.
- `widgets/` contains reusable business UI blocks, such as terminal panes, SFTP explorer, session explorer, and task queue.
- `features/` contains user workflows, such as connecting sessions, managing SFTP files, terminal search, and global shortcuts.
- `entities/` contains domain state, repositories, validation, and model helpers for sessions, terminals, SFTP, security, tasks, and workspace layout.
- `shared/` contains infrastructure shared across layers: IPC, command registry, stores, UI primitives, theme, copy, dialogs, feedback, and error handling.

Dependency direction should generally flow from higher-level composition to lower-level primitives: `app/pages/shell/widgets/features -> entities -> shared`. Avoid importing `widgets`, `features`, or `shell` from `entities` and `shared`.

Frontend layer imports are checked by `npm --prefix frontend run guard`. The guard prevents lower layers from depending on higher layers: `shared` must not import application layers, `entities` must not import `features/widgets/shell/pages/app`, `features` must not import `widgets/shell/pages/app`, and `widgets` must not import `shell/pages/app`. `shell` may reuse page components for overlays, but must not import `app`.

Pure view-state helpers shared by widgets should use small shared types such as `PanelBodyState` from `shared/ui`, while keeping business state in `entities` and workflow orchestration in `features`.

## Backend Layers

- `commands/` exposes Tauri command handlers and converts IPC input into service calls.
- `services/` owns application workflows such as terminal lifecycle, SFTP operations, credential operations, and session management.
- `domain/` contains core request/response models and domain helpers.
- `infrastructure/` wraps external side effects including SSH, keyring, file stores, known hosts, and event delivery.
- `ipc/` defines DTOs, event payloads, and the command contract consumed by frontend generation checks.
- `state.rs` contains shared backend state guarded by explicit locks.

Path ownership is centralized in `infrastructure/app_paths.rs`. Backend services should access persisted store paths and security-related paths through `BackendState.paths` instead of reconstructing paths locally.

Command handlers should stay thin. Validation and orchestration belong in services; protocol and filesystem details belong in infrastructure.

## IPC Contract

The backend contract in `src-tauri/src/ipc/contract.rs` is checked against generated frontend artifacts by `npm run check:ipc`. The generated file exposes command names, command records, and the `BackendCommandName` type for frontend contract checks. Add new commands by updating the Rust command handler, DTO/domain types, IPC contract, and typed frontend facade together.

## Security Boundaries

- Frontend code must not persist raw passwords or private key passphrases.
- Backend services are responsible for host-key verification and credential storage decisions.
- Tauri capabilities should remain scoped to the `main` window and only include permissions required by current workflows.
- DevTools are enabled through the explicit Cargo feature `devtools` for development, and are not part of the default release feature set.

## Concurrency Notes

Terminal and SFTP runtimes are long-lived resources. Terminal SSH runtime ownership lives in a per-session actor-style command queue, so read, write, resize, keepalive, and close operations are serialized before touching the same SSH channel. Cached SFTP sessions live behind per-connection runtime handles, so the global cache lock is not held during remote I/O and operations on the same connection are serialized.

## Architecture Decisions

- `docs/adr/0001-tauri-devtools-feature-gate.md` documents the release DevTools policy.
- `docs/adr/0002-terminal-runtime-actor.md` documents terminal runtime ownership.
- `docs/adr/0003-ssh-host-key-policy.md` documents SSH host key trust behavior.
- `docs/adr/0004-sftp-session-runtime-handle.md` documents cached SFTP session ownership.
