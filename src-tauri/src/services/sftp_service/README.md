# SFTP Service Modules

This directory contains private implementation modules for `src-tauri/src/services/sftp_service.rs`.

- `connection.rs` owns SSH/SFTP session creation, authentication, compatibility fallback, and request validation.
- `tasks.rs` owns SFTP task snapshots, persistence, pruning, sorting, and cancellation state updates.
- `transfer.rs` owns upload/download streaming, progress events, completion/failure events, and cancellation checks.

The parent `sftp_service.rs` remains the public service facade used by Tauri commands. Keep command-facing function names there so IPC handlers do not need to know the internal module layout.
