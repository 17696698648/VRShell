# ADR 0002: Serialize Terminal Runtime Operations with a Per-Session Actor

## Status

Accepted

## Context

Terminal sessions share one SSH channel per connected session. Reads, writes, resize operations, keepalive, and close operations can be triggered from different threads. Directly locking a shared runtime while performing SSH I/O risks input latency and lifecycle races.

## Decision

Each terminal session stores a lightweight `TerminalRuntime` handle. The actual SSH runtime is owned by a background actor thread. Callers send commands through a channel for read, write, resize, keepalive, and close operations.

The state lock only protects the handle registry. SSH channel operations are serialized inside the actor and do not run while holding the registry lock.

## Consequences

- Terminal I/O operations cannot concurrently mutate the same SSH channel.
- Disconnect and cleanup paths close the actor explicitly.
- Runtime command tracing can report per-command latency.
- Future changes should avoid reintroducing direct SSH channel access through shared state.
