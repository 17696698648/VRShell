# VRShell UI 最终设计方案

## 1. 设计结论

VRShell 前端按“桌面工作台 + 领域分层 + typed IPC”建设。UI 不直接依赖 Tauri、SSH、SFTP、keyring 等实现细节，只通过 `shared/ipc` 和各领域 repository 与后端交互。

最终目标不是把若干 Vue 页面拼在一起，而是构建一个可长期演进的小型 IDE/运维工作台。

### 核心原则

- **领域清晰**：Session、Terminal、SFTP、Task、Workspace、Settings、Security 各自独立。
- **UI 可替换**：业务逻辑不绑定具体组件库、页面结构或 xterm 实例。
- **IPC 类型安全**：所有 Tauri invoke 和事件监听必须经过 typed wrapper、可 mock、可测试。
- **状态可恢复**：持久化状态带版本、migration、恢复策略和失败降级。
- **副作用集中**：IPC event、xterm、SFTP 任务、窗口事件、快捷键统一注册和释放。
- **高频数据隔离**：terminal output、传输进度等高频数据不进入 Vue 深响应式链路。
- **渐进落地**：先完成 SSH Terminal 主链路，再扩展 SFTP、设置、诊断和插件预留。
- **安全默认**：凭据不进普通 store，不进 session JSON，不进日志明文。

---

## 2. 与后端重构方案的边界

本方案与 `docs/backend-refactor-suggestions.md` 对齐。后端已按完全重构方向建立 `ipc`、`domain`、`services`、`infrastructure`、`state`、`error` 等边界，前端必须尊重这些边界。

### 前后端对应关系

```text
frontend/src/shared/ipc        -> src-tauri/src/commands.rs + ipc/*
frontend/src/entities/session  -> domain/session.rs + session_service.rs
frontend/src/entities/terminal -> domain/terminal.rs + terminal_service.rs + ssh_client.rs
frontend/src/entities/sftp     -> domain/sftp.rs + sftp_service.rs + sftp_client.rs
frontend/src/entities/security -> domain/security.rs + credential_service.rs + known_hosts_store.rs
frontend command registry      -> IPC command id + structured error + frontend action
```

### 前端必须遵守

- 组件、widgets、pages 不允许直接调用 `invoke`。
- 所有 IPC 命令只在 `shared/ipc` 注册和调用。
- 领域 repository 只做 IPC 映射、DTO 转换、错误归一化，不写 UI 状态。
- 前端 command registry 不关心 SSH/SFTP 实现，只关心命令可用性、参数、错误和恢复动作。
- 后端返回 `notImplemented` 时，前端展示明确的占位状态，不吞错、不伪装成功。

---

## 3. 最终目录结构

首期采用 Feature-Sliced Design 的变体，但避免过度拆分。目录按稳定边界划分，而不是按页面随意堆叠。

```text
src/
  app/                    # 应用启动、Provider、全局生命周期
  shell/                  # 顶层工作台壳：标题栏、侧栏、状态栏、布局、overlay host
  pages/                  # 页面级组合：workbench、settings、welcome
  widgets/                # 大型业务 UI 块：session explorer、terminal workbench、sftp explorer
  features/               # 用户动作/用例：connect-session、upload-files、open-command-palette
  entities/               # 核心业务实体：session、terminal、sftp、task、workspace、security
  shared/                 # 基础设施：ipc、ui、theme、logger、errors、events、utils、types
```

### 依赖方向

```text
app -> pages -> shell/widgets -> features -> entities -> shared
```

规则：

- `shared` 不依赖任何业务目录。
- `entities` 不依赖 `features`、`widgets`、`pages`、`shell`。
- `features` 可以依赖多个 `entities` 编排用户动作。
- `widgets` 只组合 UI 和 feature，不承载复杂领域规则。
- `pages` 只组合 layout 和 widgets，不直接写业务流程。
- `app` 只负责启动、Provider、全局生命周期和错误边界。

建议用 ESLint import rule 或自定义脚本强制校验依赖方向。

---

## 4. 推荐目录明细

```text
src/
  app/
    main.ts
    App.vue
    providers/
      AppProviders.vue
      ThemeProvider.vue
      IpcEventProvider.vue
      ShortcutProvider.vue
      PersistenceProvider.vue
      ErrorBoundaryProvider.vue
    lifecycle/
      bootstrapApp.ts
      restoreAppState.ts
      registerGlobalEffects.ts
      shutdownApp.ts

  shell/
    WorkbenchShell.vue
    titlebar/
      AppTitlebar.vue
      WindowControls.vue
      WorkspaceTabs.vue
    activity-bar/
      ActivityBar.vue
      ActivityBarItem.vue
    sidebar/
      Sidebar.vue
      SidebarPanelHost.vue
    status-bar/
      StatusBar.vue
    overlays/
      DialogHost.vue
      ToastHost.vue
      ContextMenuHost.vue
      CommandPaletteHost.vue
      DragOverlay.vue

  pages/
    workbench/
      WorkbenchPage.vue
      useWorkbenchPage.ts
    settings/
      SettingsPage.vue
    welcome/
      WelcomePage.vue

  widgets/
    session-explorer/
      ui/
        SessionExplorer.vue
        SessionTree.vue
        SessionTreeNode.vue
        SessionSearchBox.vue
        SessionToolbar.vue
      model/
        useSessionExplorer.ts
    terminal-workbench/
      ui/
        TerminalWorkbench.vue
        TerminalTabs.vue
        TerminalPane.vue
        TerminalViewport.vue
        TerminalEmptyState.vue
      model/
        useTerminalWorkbench.ts
    sftp-explorer/
      ui/
        SftpExplorer.vue
        SftpToolbar.vue
        SftpFileList.vue
        SftpBreadcrumbs.vue
        SftpTaskMiniPanel.vue
      model/
        useSftpExplorer.ts
    task-center/
      ui/
        TaskCenter.vue
        TaskList.vue
        TaskListItem.vue
      model/
        useTaskCenter.ts

  features/
    session/
      create-session/
      edit-session/
      delete-session/
      move-session-node/
      import-ssh-config/
      connect-session/
      test-connection/
    terminal/
      open-terminal/
      close-terminal/
      reconnect-terminal/
      send-terminal-input/
      resize-terminal/
      search-terminal/
    sftp/
      open-directory/
      upload-files/
      download-files/
      rename-file/
      delete-file/
      create-directory/
      retry-task/
      cancel-task/
    workspace/
      switch-panel/
      manage-tabs/
      quick-open/
      open-command-palette/
    settings/
      switch-theme/
      update-keybindings/
      update-security-settings/
    security/
      accept-host-key/
      reject-host-key/
      save-credential/

  entities/
    session/
      model/
        session.types.ts
        session.schema.ts
        session.store.ts
        session.selectors.ts
        sessionTree.ts
        sessionValidation.ts
      api/
        sessionRepository.ts
      lib/
        normalizeSession.ts
        createSessionId.ts
      index.ts
    terminal/
      model/
        terminal.types.ts
        terminal.store.ts
        terminal.selectors.ts
        terminalStateMachine.ts
      api/
        terminalRepository.ts
      lib/
        TerminalInstanceRegistry.ts
        terminalBuffer.ts
      index.ts
    sftp/
      model/
        sftp.types.ts
        sftp.store.ts
        sftp.selectors.ts
      api/
        sftpRepository.ts
      lib/
        pathUtils.ts
        conflictPolicy.ts
      index.ts
    task/
      model/
        task.types.ts
        task.store.ts
        task.selectors.ts
      index.ts
    workspace/
      model/
        workspace.types.ts
        workspace.store.ts
        workspace.selectors.ts
      index.ts
    security/
      model/
        security.types.ts
        security.store.ts
      api/
        credentialRepository.ts
        securityRepository.ts
      index.ts

  shared/
    ipc/
      commands.ts
      events.ts
      types.ts
      errors.ts
      invoke.ts
      listen.ts
      mockIpc.ts
      contract.test.ts
    command/
      command.types.ts
      commandRegistry.ts
      keybindingRegistry.ts
    events/
      eventBus.ts
      disposable.ts
    ui/
      button/
      input/
      dialog/
      menu/
      tree/
      tabs/
      empty-state/
      error-state/
    theme/
      tokens.ts
      themes.ts
      density.ts
    persistence/
      persistedStore.ts
      migrations.ts
    logger/
      logger.ts
      redact.ts
    errors/
      appError.ts
      errorPresenter.ts
    utils/
    types/
```

首期可以暂不实现 editor/workbench、插件系统和复杂诊断面板，但目录边界要预留。

---

## 5. IPC 契约设计

### 命令命名

前端 typed IPC 使用业务命名，内部映射到 Tauri command。兼容旧 command 的逻辑只允许存在于 `shared/ipc` 或后端 `commands.rs`，不能扩散到业务代码。

推荐命令：

```text
session.loadTree
session.saveTree
session.applyTreeAction
session.importSshConfig
terminal.open
terminal.write
terminal.resize
terminal.close
terminal.reconnect
sftp.list
sftp.upload
sftp.download
sftp.mkdir
sftp.rename
sftp.remove
task.cancel
credential.save
credential.read
security.acceptHostKey
security.rejectHostKey
```

后端兼容期可能保留 `connect_ssh`、`sftp_list`、`session_tree_action` 等旧命令，前端新代码不直接使用旧命令名。

### typed invoke

```ts
export async function typedInvoke<TCommand extends IpcCommandName>(
  command: TCommand,
  payload: IpcCommandPayload<TCommand>,
): Promise<IpcCommandResult<TCommand>> {
  try {
    return await invoke(resolveTauriCommand(command), payload)
  } catch (error) {
    throw normalizeIpcError(error)
  }
}
```

要求：

- payload 和 response 必须有 TypeScript 类型。
- 与后端 DTO 对齐，字段使用 camelCase。
- IPC 错误统一转换为 `AppError`。
- 测试环境通过 `mockIpc` 替代真实 Tauri。
- 不允许在 Vue 组件中直接 import `@tauri-apps/api/core`。

### IPC 错误模型

前端统一识别后端结构化错误：

```ts
export interface IpcErrorDto {
  code:
    | 'notImplemented'
    | 'validationError'
    | 'authFailed'
    | 'hostKeyRejected'
    | 'networkUnavailable'
    | 'permissionDenied'
    | 'notFound'
    | 'internalError'
  message: string
  recoverable: boolean
  details?: Record<string, unknown>
}
```

UI 展示原则：

- `notImplemented`：显示“功能建设中”，并禁用不可用动作。
- `validationError`：定位到表单字段或操作输入。
- `authFailed`：提供重新输入凭据、编辑会话、查看日志入口。
- `hostKeyRejected`：打开 host key 确认 Dialog。
- `networkUnavailable`：提供重试、编辑连接、复制诊断信息。
- `internalError`：展示安全文案，详细信息只进入脱敏日志。

---

## 6. IPC 事件设计

后端事件统一由 `IpcEventProvider` 订阅，并分发到领域 store 或实例 registry。

推荐事件：

```text
terminal.output
terminal.closed
terminal.error
sftp.progress
sftp.completed
sftp.failed
security.hostKeyRequested
interaction.promptRequested
```

事件处理规则：

- `terminal.output` 只写入 `TerminalInstanceRegistry`，不进入响应式 store。
- `terminal.closed` 更新 terminal store 状态，并释放 xterm 相关资源。
- `terminal.error` 转为 `AppError`，由对应 tab、toast 或 dialog 展示。
- `sftp.progress` 更新 task store 中的轻量 progress 状态。
- `security.hostKeyRequested` 打开安全确认 dialog，用户选择再调用 security command。
- 所有 listener 必须返回 disposable，并在 app shutdown 或 provider unmount 时释放。

事件命名采用 `domain.eventName`，例如 `terminal.output`，禁止临时字符串散落在组件里。

---

## 7. 状态管理设计

状态分为三类：Persistent、Runtime、Ephemeral。

### Persistent Store

需要持久化、恢复、migration。

- `session.store`：session tree、分组、排序、最近使用时间、credentialRef。
- `workspace.store`：打开的 tab、active tab、sidebar 状态、布局尺寸。
- `settings.store`：主题、密度、字体、快捷键、安全偏好。

要求：

- 每份持久化数据必须带 `schemaVersion`。
- migration 失败时保留原文件备份，并进入安全降级空态。
- session JSON 不允许保存密码、passphrase、私钥内容。
- workspace 恢复默认只恢复布局，不默认恢复 SSH/SFTP 连接，除非用户明确开启。

### Runtime Store

应用运行期间存在，不直接持久化。

- `terminal.store`：terminal tab 元信息、连接状态、错误摘要。
- `sftp.store`：当前目录、列表缓存、连接引用、选择状态。
- `task.store`：传输任务、进度、失败原因、取消状态。
- `security.store`：等待确认的 host key、credential prompt、临时授权状态。

要求：

- Runtime store 不保存 xterm instance、文件句柄、AbortController 等不可序列化对象。
- 复杂副作用用 registry 或 service 管理，store 只保存可观察状态。

### Ephemeral Store

纯 UI 临时状态。

- hover、focused、drag indicator、context menu position。
- dialog open state、toast queue、command palette query。
- tree 展开状态可按场景选择是否持久化。

要求：

- Ephemeral 状态不要污染领域模型。
- 可由组件局部 state 管理，不必全部进入全局 store。

### Store 选型

建议使用 Pinia 承载全局 store，原因是团队协作和 DevTools 成本更低。领域纯函数、selector、repository 仍放在 `entities/*/model` 和 `entities/*/api` 中，避免把所有逻辑塞进 Pinia action。

如果暂不引入 Pinia，也必须提供统一 store 工厂，支持：

- `getState`
- `setState`
- `subscribe`
- `reset`
- `hydrate`
- `dehydrate`
- test mock

---

## 8. Session 设计

Session 是 VRShell 的核心入口，前端模型与后端 session domain 对齐。

### Session 类型

```ts
export interface SessionNode {
  id: string
  parentId: string | null
  type: 'folder' | 'ssh'
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
}

export interface SshSession extends SessionNode {
  type: 'ssh'
  host: string
  port: number
  username: string
  auth: SshAuthConfig
  credentialRef?: CredentialRef
  tags?: string[]
}

export interface CredentialRef {
  provider: 'keyring'
  id: string
}
```

### Session Tree

采用 normalized model：

```ts
export interface SessionTreeState {
  nodesById: Record<string, SessionNode>
  childrenByParentId: Record<string, string[]>
  rootIds: string[]
  selectedId?: string
  focusedId?: string
  expandedIds: string[]
  version: number
}
```

要求：

- create/edit/delete/move/touch 使用 typed action。
- import SSH config 返回候选项，由用户确认后写入 session tree。
- 删除 folder 需要确认是否递归删除。
- 移动节点必须防止循环引用。
- 搜索、过滤、排序通过 selector 完成，不修改原始树。

---

## 9. Terminal 设计

Terminal 由后端 `TerminalRegistry` 管理真实连接和输出事件，前端只管理 tab 元信息、xterm 实例和用户交互。

### 状态机

```text
idle -> creating -> connecting -> connected
connected -> reconnecting -> connected
connected -> disconnected
connecting -> failed
reconnecting -> failed
failed -> reconnecting
any -> closing -> disposed
```

### Terminal Store

```ts
export interface TerminalTab {
  id: string
  backendTerminalId?: string
  sessionId: string
  title: string
  status:
    | 'creating'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'disconnected'
    | 'failed'
    | 'closing'
    | 'disposed'
  error?: AppErrorSummary
  createdAt: string
  lastActiveAt: string
}
```

### xterm 实例管理

`TerminalInstanceRegistry` 只在前端运行时存在：

```ts
class TerminalInstanceRegistry {
  mount(tabId: string, container: HTMLElement): void
  unmount(tabId: string): void
  write(tabId: string, data: string | Uint8Array): void
  focus(tabId: string): void
  resize(tabId: string, cols: number, rows: number): void
  dispose(tabId: string): void
}
```

要求：

- store 不保存 xterm instance。
- output 不进入 Pinia/Vue 深响应式。
- 隐藏 tab 可以暂停 fit/measure，但不能丢失必要输出。
- 大量输出需要 backpressure 或批量写入策略。
- 输入、resize、close 通过 terminal repository 调 IPC。
- 连接失败必须给出重试、编辑会话、复制错误信息入口。

---

## 10. SFTP 与任务设计

SFTP 连接由后端连接池管理，前端关注文件列表、路径导航、任务进度和冲突处理。

### SFTP Store

```ts
export interface SftpPanelState {
  id: string
  sessionId: string
  currentPath: string
  entries: SftpEntry[]
  selectedPaths: string[]
  loading: boolean
  error?: AppErrorSummary
  cacheKey?: string
}

export interface SftpEntry {
  name: string
  path: string
  kind: 'file' | 'directory' | 'symlink' | 'unknown'
  size?: number
  modifiedAt?: string
  permissions?: string
}
```

### Task Store

```ts
export interface TaskItem {
  id: string
  type: 'upload' | 'download' | 'delete' | 'rename' | 'mkdir' | 'list' | 'search'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  title: string
  progress?: {
    transferred: number
    total?: number
    speed?: number
    percent?: number
  }
  error?: AppErrorSummary
  createdAt: string
  updatedAt: string
}
```

要求：

- list 支持 loading、empty、permission denied、error 四类状态。
- 上传/下载必须支持取消、失败重试、完成后打开位置。
- 文件冲突策略支持覆盖、跳过、重命名、应用到全部。
- 删除远程文件必须二次确认，批量删除需要更强确认。
- 目录缓存需要 TTL、手动刷新和 mutation 后局部失效。

---

## 11. Security 与 Credential 设计

安全能力独立为 `entities/security` 和对应 features。

### 凭据规则

- 密码、passphrase、私钥内容不进入普通前端 store。
- session 只保存 `credentialRef`。
- 保存凭据统一调用 `credential.save`，读取凭据由后端服务完成，前端不主动读取明文。
- 日志、错误、诊断导出必须脱敏。

### Host Key 流程

```text
terminal.open
  -> backend detects unknown/changed host key
  -> security.hostKeyRequested event
  -> HostKeyConfirmDialog
  -> security.acceptHostKey 或 security.rejectHostKey
  -> terminal.open retry 或 fail
```

UI 要展示：

- host、port、username。
- key type 和 fingerprint。
- 首次连接、已变更、被拒绝三类状态。
- 接受一次、永久信任、拒绝连接三个动作。

---

## 12. Workspace 设计

Workspace 负责工作台布局和 tab 管理，不关心 SSH/SFTP 具体实现。

### Workspace State

```ts
export interface WorkspaceState {
  activeActivity: 'sessions' | 'sftp' | 'tasks' | 'settings'
  sidebarVisible: boolean
  sidebarWidth: number
  tabs: WorkspaceTab[]
  activeTabId?: string
  layoutVersion: number
}

export interface WorkspaceTab {
  id: string
  kind: 'terminal' | 'sftp' | 'settings' | 'welcome'
  entityId: string
  title: string
  icon?: string
  dirty?: boolean
  closable: boolean
}
```

规则：

- `WorkspaceTab` 只保存 entity 引用，不保存 terminal/sftp 细节。
- 启动恢复默认恢复 tabs 和布局，不自动恢复真实连接。
- 关闭 tab 时，由 feature 编排 workspace store、terminal/sftp repository 和 registry dispose。
- ActivityBar、Sidebar、MainArea、StatusBar 只读 workspace 状态和 command 状态。

---

## 13. Command 与快捷键系统

所有用户动作统一注册为 command，由按钮、菜单、右键菜单、快捷键、命令面板复用。

```ts
export interface AppCommand<TPayload = void> {
  id: string
  title: string
  category: string
  icon?: string
  defaultKeybinding?: string
  when?: CommandContextPredicate
  run(payload: TPayload): Promise<void> | void
}
```

要求：

- command id 使用 `domain.action`，例如 `session.connect`、`terminal.close`、`sftp.upload`。
- command 的可用性由 `when` 判断，不在按钮里重复写一套规则。
- 快捷键支持 scope，例如 `global`、`terminal`、`sftp`、`dialog`。
- 快捷键冲突在 Settings 中可见并可修复。
- 危险 command 必须通过 dialog feature 二次确认。

---

## 14. UI 布局与视觉规范

### Workbench 结构

```text
+------------------------------------------------------+
| Titlebar / WorkspaceTabs / WindowControls            |
+----------+----------------------+--------------------+
| Activity | Sidebar              | Main Workbench     |
| Bar      | Session/SFTP/Task    | Terminal/SFTP Tabs |
+----------+----------------------+--------------------+
| StatusBar                                             |
+------------------------------------------------------+
```

### 推荐尺寸

- Titlebar：32px。
- ActivityBar：48px。
- Sidebar：默认 280px，最小 220px，最大 480px。
- StatusBar：24px。
- Tab height：32px。
- Tree item height：24px/28px，随 density 调整。

### 主题 token

```ts
export interface ThemeTokens {
  color: {
    background: string
    surface: string
    surfaceHover: string
    border: string
    text: string
    textMuted: string
    accent: string
    danger: string
    warning: string
    success: string
  }
  font: {
    ui: string
    mono: string
    size: number
  }
  radius: {
    sm: string
    md: string
    lg: string
  }
  spacing: Record<string, string>
}
```

要求：

- 支持 dark/light，默认优先跟随系统。
- 支持 compact/default density。
- Terminal 字体独立配置。
- 颜色不能直接散落在组件 CSS 中，必须来自 token。

---

## 15. 关键用户工作流

### 首次启动

```text
App bootstrap
  -> load settings/session/workspace
  -> migration if needed
  -> show welcome or workbench
  -> command palette / create session 可用
```

### 连接 SSH

```text
User selects session
  -> command session.connect
  -> feature connect-session
  -> terminalRepository.open(sessionId)
  -> backend terminal.open
  -> terminal tab created
  -> terminal.output events
  -> TerminalInstanceRegistry.write(tabId, data)
```

### Host Key 确认

```text
terminal.open
  -> security.hostKeyRequested
  -> HostKeyConfirmDialog
  -> accept/reject
  -> retry terminal.open or mark failed
```

### 浏览 SFTP

```text
User opens SFTP for session
  -> command sftp.openDirectory
  -> sftpRepository.list(path)
  -> SftpExplorer renders entries
  -> upload/download creates task
  -> sftp.progress updates TaskCenter
```

### 恢复工作区

```text
App restore
  -> restore layout/tabs
  -> terminal tabs show disconnected/restorable state
  -> user manually reconnects unless auto reconnect enabled
```

---

## 16. 交互状态规范

### 基础状态

每个复杂区域至少覆盖：

- idle
- loading
- empty
- ready
- partial
- error
- disabled

### 反馈分级

- Inline：字段校验、局部列表错误。
- Toast：轻量成功、失败摘要、任务完成。
- Dialog：危险操作、host key、凭据输入、不可恢复错误。
- StatusBar：连接状态、任务数量、后台活动。

### 危险操作

需要确认的操作：

- 删除 session/folder。
- 删除远程文件或目录。
- 覆盖远程文件。
- 关闭多个 terminal。
- 清空 known_hosts 或凭据引用。

批量删除、递归删除、覆盖全部等高风险操作需要更强文案确认。

---

## 17. 持久化与 Migration

持久化对象：

- session tree：优先由后端 `load_session_tree` / `save_session_tree` 或 typed session command 负责。
- settings：前端本地持久化。
- workspace layout：前端本地持久化。
- credential：只通过后端 keyring，不进入前端持久化。

持久化格式要求：

```ts
export interface PersistedDocument<T> {
  schemaVersion: number
  savedAt: string
  data: T
}
```

Migration 要求：

- 每次 schema 变更新增 migration。
- migration 必须可单测。
- 失败时保留原始备份，并展示恢复提示。
- 不允许静默丢弃用户 session 数据。

---

## 18. 性能设计

### 预算

- 冷启动到空工作台：目标 2s 内。
- 打开命令面板：100ms 内出现。
- Session tree 1000 节点搜索：100ms 内响应。
- Terminal 输入回显感知延迟：50ms 内。
- Terminal 大量输出不阻塞主 UI。
- SFTP 1000 文件目录渲染不明显卡顿。

### 策略

- 大树、大列表默认虚拟化。
- terminal output 批量写入 xterm，不进 store。
- SFTP list 支持分页或渐进渲染。
- 高频 resize/input 需要 throttle/debounce。
- heavy selector 使用 memoization。
- 非活跃 tab 降低渲染频率。

---

## 19. 测试策略

### 测试分层

- `entities`：纯函数、状态机、selector、validation 单测。
- `features`：mock repository 的用例测试。
- `widgets`：组件交互测试。
- `shared/ipc`：contract test、error normalization、mock test。
- E2E：首次启动、创建 session、连接失败、打开 terminal、SFTP 基础流。

### 必测场景

- session tree create/edit/delete/move/import。
- typed IPC payload 和错误转换。
- terminal 状态机转移。
- terminal output 不进入响应式 store。
- SFTP 任务进度、失败、取消、重试。
- host key 确认流程。
- workspace restore 和 migration 失败降级。

---

## 20. 技术选择

### 确定使用

- Vue 3 Composition API。
- TypeScript。
- Vite。
- Tauri typed IPC wrapper。
- xterm.js。
- Vitest。
- Playwright。

### 建议使用

- Pinia：全局 store。
- Zod 或 Valibot：表单和 IPC payload 运行时校验。
- TanStack Virtual：Session tree、SFTP list 虚拟化。
- Fuse.js：命令面板、快速打开、session 搜索。
- VueUse：窗口、快捷键、节流、防抖等通用能力。

### 暂缓引入

- 大型状态机库，除非 Terminal/SFTP 状态复杂到难以维护。
- 大型 UI 框架，工作台 UI 需要高度定制。
- GraphQL/React Query 类方案，Tauri 本地 IPC 收益有限。
- 插件系统，首期只做好 command registry 和 extension point 预留。

---

## 21. 实施路线

### M0：最小闭环

目标：验证前后端 typed IPC 和 SSH Terminal 主路径。

交付：

- 应用启动到 WorkbenchShell。
- `shared/ipc` typed invoke 可 mock。
- Session tree 可加载、保存、创建、编辑。
- 点击 session 创建 terminal tab。
- terminal open 返回 session id 或结构化错误。
- `notImplemented`、连接失败等错误能正确展示。

### M1：基础设施

交付：

- `app`、`shell`、`shared` 基础目录稳定。
- Theme token、density、基础组件完成。
- Dialog/Toast/ContextMenu/CommandPalette host 完成。
- command registry 和 keybinding registry 完成。
- IpcEventProvider 和 disposable 机制完成。
- 基础 contract test 完成。

### M2：Session 管理

交付：

- `entities/session` 完成 normalized tree。
- create/edit/delete/move/touch/import 完成。
- SSH config import 确认流完成。
- session validation 和 migration 完成。
- SessionExplorer 支持搜索、拖拽、右键菜单、空态。

### M3：Terminal

交付：

- `entities/terminal` store、repository、状态机完成。
- TerminalInstanceRegistry 完成。
- open/write/resize/close/reconnect 完成。
- terminal output 事件接入 xterm。
- 连接状态、错误态、重试动作完整。
- 性能压测覆盖大量输出。

### M4：Security/Credential

交付：

- credentialRef 接入 session 表单。
- 保存凭据调用 keyring command。
- host key 确认 dialog 完成。
- 日志与错误脱敏完成。
- Security settings 初版完成。

### M5：SFTP 与 TaskCenter

交付：

- SftpExplorer 完成目录浏览。
- upload/download/mkdir/rename/delete 完成。
- TaskCenter 展示 progress、cancel、retry。
- 冲突策略和危险操作确认完成。
- SFTP 错误态、空态、权限态完整。

### M6：Workspace 体验与发布质量

交付：

- workspace tabs、layout persistence、restore 完成。
- Settings 分组、搜索、快捷键冲突提示完成。
- 全局错误处理和诊断导出完成。
- E2E 主流程完成。
- 崩溃恢复和发布前验收清单完成。

---

## 22. 验收清单

### 架构验收

- 没有组件直接调用 Tauri invoke。
- 没有跨层反向依赖。
- repository 不包含 UI 状态。
- command registry 是用户动作唯一入口。
- 所有 IPC command/event 有集中类型定义。

### 功能验收

- Session 可以创建、编辑、删除、移动、导入。
- SSH 连接成功、失败、host key 确认都有明确 UI。
- Terminal 可以输入、resize、关闭、重连。
- SFTP 可以浏览、上传、下载、删除、重命名。
- Task 可以查看进度、取消、重试。
- Workspace 可以恢复布局。

### 安全验收

- session JSON 不保存密码和 passphrase。
- 日志和错误信息默认脱敏。
- host key 变更必须显式确认。
- 危险文件操作必须二次确认。
- 诊断导出不包含敏感凭据。

### 性能验收

- Terminal 大量输出不造成 UI 明显卡顿。
- 大 session tree 和 SFTP list 使用虚拟化或渐进渲染。
- 搜索、命令面板、tab 切换响应稳定。
- 高频事件没有进入深响应式 store。

### 测试验收

- 核心 entities 有单测。
- IPC contract 和 error normalization 有测试。
- Terminal/SFTP 状态机有测试。
- 关键用户主链路有 E2E。

---

## 23. 最终数据流示例

### 连接一个 SSH 会话

```text
User clicks session node
  -> command session.connect
  -> features/session/connect-session
  -> entities/session selector 获取 session
  -> entities/terminal repository 调用 terminal.open
  -> shared/ipc typedInvoke
  -> backend commands.rs
  -> terminal_service 创建 terminal session
  -> backend 返回 terminal id
  -> terminal store 添加 tab runtime state
  -> workspace store 打开 terminal tab
  -> TerminalWorkbench 渲染 TerminalPane
  -> TerminalViewport mount xterm
  -> IpcEventProvider 接收 terminal.output
  -> TerminalInstanceRegistry.write(tabId, data)
```

关键点：

- UI 不知道 Tauri invoke。
- IPC 不知道 UI。
- Store 不持有 xterm instance。
- Output 不经过重型响应式链路。
- Workspace 只管 tab，不管 SSH 细节。
- 后端负责真实连接、输出事件和资源释放。

---

## 24. 最终结论

VRShell UI 的最终架构应以 `typed IPC + command registry + entities 领域模型 + WorkbenchShell` 为主干。

首期不要追求完整 IDE 功能，而要优先打通：

```text
Session Tree -> Connect SSH -> Terminal Tab -> IPC Event -> xterm Output -> Close/Reconnect
```

当这条主链路稳定后，再扩展 SFTP、TaskCenter、Settings、Security、Diagnostics。这样既能与后端完全重构保持一致，又能避免前端在早期陷入过度目录化和过度抽象。
