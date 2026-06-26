# Terminal Service Modules

This directory contains private implementation modules for `src-tauri/src/services/terminal_service.rs`.

- `events.rs` owns terminal and security event payloads plus event emission helpers.
- The parent `terminal_service.rs` owns connection orchestration, host key decisions, terminal runtime registration, output polling, input, resize, and disconnect behavior.

Keep host key verification and terminal runtime lifecycle in the parent service until they are split into dedicated modules with focused tests.
