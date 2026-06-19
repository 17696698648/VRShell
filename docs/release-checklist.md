# Release Checklist

Use this checklist before creating a public build or publishing an update.

## Build readiness

- [ ] `npm run check` passes locally or in CI.
- [ ] `npm run test:e2e:smoke` passes against the production frontend build.
- [ ] `npm run tauri:build` completes on each release target platform.
- [ ] Release notes include user-visible changes, migration notes, and known issues.

## DevTools policy

- [ ] Confirm release builds do not expose Tauri DevTools by default.
- [ ] If a diagnostic build enables DevTools, label it clearly and do not distribute it as a normal release.

## Signing and distribution

- [ ] Code signing certificates/secrets are present only in trusted CI or release machines.
- [ ] Signing identity and notarization requirements are verified for each target OS.
- [ ] Generated artifacts, hashes, and signatures are archived with the release.

## SSH and known_hosts behavior

- [ ] Unknown-host prompts show the expected fingerprint and host identity.
- [ ] `known_hosts` writes respect the configured hash-hostnames behavior.
- [ ] Existing `known_hosts` entries are not rewritten unexpectedly during normal connect/SFTP flows.
- [ ] Host key mismatch behavior blocks the connection and communicates the risk clearly.

## Credential migration

- [ ] Stored session metadata migration is backward-compatible with the previous release.
- [ ] Credential/keyring entries from the previous release can still be read.
- [ ] Removed or renamed credential keys have a documented migration or cleanup path.
- [ ] Rollback from the new release does not orphan credentials needed by the previous version.

## Upgrade and rollback

- [ ] Upgrade from the previous stable version preserves sessions, groups, themes, and SSH settings.
- [ ] Rollback instructions are documented for users and support staff.
- [ ] Known data format changes have export/backup guidance.
- [ ] Known issues and workaround notes are included in the release notes.
