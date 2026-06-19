# Testing

Use the fastest checks first while developing, then run broader checks before opening a PR.

## Frontend checks

```powershell
npm run lint
npm run typecheck
npm run test:frontend
npm run build
```

`npm run lint` runs Biome for lightweight JavaScript/TypeScript safety checks. Vue template-aware type issues are covered by `npm run typecheck`.

Vite 8 uses Rolldown. Known `INVALID_ANNOTATION` warnings from `@vueuse/core` are filtered in `frontend/vite.config.ts` because they are dependency annotation noise and do not affect the build output.

## E2E smoke

```powershell
npm run test:e2e:smoke
```

The smoke test builds and previews the frontend, injects a minimal Tauri runtime mock, then verifies:

- app startup
- command palette open, input focus, and Escape close
- new session dialog open, Cancel close, and Escape close
- SFTP drawer toggle
- theme switching

Reusable browser-side Tauri mocks live in `frontend/e2e/fixtures/tauri.ts`.

If Playwright browsers are missing locally, run:

```powershell
npx --prefix frontend playwright install chromium
```

## Rust checks

```powershell
npm run rust:check
npm run rust:test
npm run rust:clippy
```

## Security audit

```powershell
npm run audit:frontend
npm run rust:audit
```

`npm run rust:audit` requires `cargo-audit`; install it with `cargo install cargo-audit --locked`.

## Full local confidence pass

```powershell
npm run check
npm run build
npm run test:e2e:smoke
```

`npm run check` intentionally excludes the production frontend build and E2E smoke so developers can run a faster default loop.
