# ADR 0004: Serialize Cached SFTP Session Operations Per Connection

## Status

Accepted

## Context

VRShell reuses backend SFTP sessions to avoid repeatedly transferring credentials over IPC and reconnecting for every file operation. The original cache stored raw `ssh2::Session` values behind one global map lock, so cached operations held the global session registry while opening SFTP channels and performing remote I/O.

## Decision

Cached SFTP sessions are stored as per-connection runtime handles. The global cache lock is used only to get or insert a handle. Each handle owns its SSH session behind a connection-local mutex and serializes SFTP operations for that connection.

## Consequences

- Operations for different SFTP connections no longer block on one global session lock.
- Operations for the same cached connection are serialized before touching the same SSH session.
- Failed cached operations drop the cached runtime so the next operation reconnects.
- If future transfer workflows need cancellation inside a long-running operation, promote the runtime handle to a full command actor with owned operation payloads.
