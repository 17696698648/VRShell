# UI Quality Gates

PR checks should run from fastest/static to slowest/visual:

1. `npm.cmd --prefix frontend run guard`
2. `npm.cmd --prefix frontend run lint`
3. `npm.cmd run typecheck`
4. `npm.cmd --prefix frontend run test`
5. `npm.cmd --prefix frontend run test:e2e:smoke`
6. `npm.cmd --prefix frontend run test:e2e -- --grep "visual states"`

Visual snapshot updates are release-gated or nightly-only unless the PR intentionally changes UI. When updating baselines, run:

```bash
npm.cmd --prefix frontend run test:e2e -- --grep "visual states" --update-snapshots
```

The static guard enforces core UI invariants:

- `UiDataGrid`, `UiCommandMenu`, and `UiTree` keep keyboard and ARIA affordances.
- Raw `↑` / `↓` glyphs are not used in source UI.
- `UiIconButton` instances provide labels.
- Status bar items keep short labels and use `compactLabel` / `fullLabel` for responsive text.
