# Release Checklist

Use this checklist before publishing a VRShell desktop build.

## Preflight

- Confirm the target version in `package.json`, `frontend/package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
- Run `npm.cmd run release:check` from the repository root.
- Run `npm.cmd run security:audit` and review all reported advisories.
- Confirm `npm.cmd run check:tauri-release` passes so release builds do not enable DevTools.

## Security

- Verify Tauri capabilities are limited to workflows used by the app.
- Confirm unknown SSH host keys require explicit user acceptance.
- Confirm changed SSH host keys are shown as a security warning and are not silently accepted.
- Do not persist raw passwords or private key passphrases in frontend storage.
- Review credential and keyring behavior on the release platform.

## Build

```powershell
npm.cmd run build
npm.cmd run tauri:build
```

Archive installer artifacts and checksums produced by the Tauri build.

## Smoke Test

- Start the packaged app.
- Open the command palette.
- Create or import a non-production SSH session.
- Verify host-key prompt behavior with a test host.
- Open a terminal and run a simple command.
- Open SFTP, list a directory, and test a small upload/download in a safe location.
- Close the terminal and verify the UI shows a clean closed state.

## Rollback

- Keep the previous signed installer available until the new release has been smoke-tested.
- If a release is pulled, publish the reason, affected versions, and recommended user action.
- Revert dependency or capability changes first when failures appear security- or runtime-related.
