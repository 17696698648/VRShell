# ADR 0003: Require Explicit SSH Host Key Trust Decisions

## Status

Accepted

## Context

VRShell connects to SSH/SFTP hosts and may handle production credentials. Silent acceptance of unknown or changed host keys would weaken protection against man-in-the-middle attacks.

## Decision

Backend services verify SSH host keys against `known_hosts`. Unknown host keys pause connection completion and emit a frontend trust prompt. Changed host keys are treated as non-recoverable security warnings and are not silently accepted.

Users must explicitly accept unknown fingerprints after checking them. Rejected host keys remove pending sessions without completing authentication.

## Consequences

- Host key verification remains a backend responsibility.
- Frontend UI must clearly distinguish unknown and changed host keys.
- Tests and IPC contracts should cover `accept_host_key`, `reject_host_key`, `known_hosts_path`, and `open_known_hosts` when these flows change.
