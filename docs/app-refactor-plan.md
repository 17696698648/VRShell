# App.vue Refactor Plan

`frontend/src/App.vue` currently coordinates shell layout, session tree actions, terminal tabs, SFTP browser state, command palette, context menus, and dialogs. Split it incrementally so each step can be validated without changing user-visible behavior.

## Proposed extraction order

1. `useSessionWorkspace` 鈥?active host lookup, open/close/select session tabs, session tree actions, and session form orchestration.
2. `useSftpWorkspace` 鈥?active SFTP connection creation, drawer state, tree loading, search, bookmarks, and transfer task commands.
3. `useWindowShell` 鈥?activity drawer, sidebar resize, command palette visibility, shortcut help, window menus, and context-menu placement.
4. `WorkspaceShell.vue` 鈥?presentational shell that receives state/actions and owns only template layout.

## Safety rules

- Keep `App.vue` as the composition root until all extracted composables have unit coverage.
- Move one domain at a time and preserve existing prop/event names.
- Prefer tests around composables before splitting template markup.
- Do not mix security or IPC behavior changes with visual refactors.
