
**设计目标**
- **领域清晰**：SSH、Terminal、SFTP、Session、Workspace、Settings 各自独立。
- **UI 可替换**：业务逻辑不依赖具体组件库、不依赖页面结构。
- **状态可追踪**：长期运行的桌面应用需要稳定、可恢复、可调试的状态模型。
- **IPC 可治理**：所有 Tauri 调用必须类型安全、可 mock、可观测。
- **副作用隔离**：终端、SFTP 传输、窗口事件、全局快捷键等副作用必须集中管理。
- **渐进复杂度**：简单 UI 不过度工程化，复杂领域用明确边界承载。
- **可测试**：核心领域逻辑可以脱离 Vue/Tauri 单独测试。
- **可扩展**：未来可以添加 RDP、数据库连接、脚本任务、插件系统、云同步等能力。

---

## **总体架构**

推荐使用分层 + 领域驱动的前端架构：

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

这是类似 Feature-Sliced Design 的结构，但针对桌面工作台应用做一些调整。

```text
src/
  app/                    # 应用启动、Provider、路由、全局生命周期
  shell/                  # 顶层工作台壳：标题栏、侧栏、状态栏、布局
  pages/                  # 页面级组合：WorkbenchPage、SettingsPage
  widgets/                # 大型业务 UI 块：SessionExplorer、SftpExplorer、TerminalArea
  features/               # 用户动作/用例：connect-session、upload-file、open-command-palette
  entities/               # 核心业务实体：session、terminal、sftp、task、workspace
  shared/                 # 基础设施：UI、IPC、工具、主题、日志、错误、类型
```

依赖方向固定为：

```text
app -> pages -> widgets -> features -> entities -> shared
```

反向依赖禁止。

例如：
- `features/connect-session` 可以依赖 `entities/session`、`entities/terminal`。
- `entities/session` 不能依赖 `features/connect-session`。
- `shared/ipc` 不能依赖任何业务实体。
- UI 组件不能直接调用 Tauri IPC。

---

## **推荐目录**

```text
src/
  app/
    App.vue
    main.ts
    providers/
      AppProviders.vue
      ErrorBoundaryProvider.vue
      ThemeProvider.vue
      ShortcutProvider.vue
      IpcEventProvider.vue
      PersistenceProvider.vue
    lifecycle/
      bootstrapApp.ts
      shutdownApp.ts
      restoreAppState.ts
      registerGlobalEffects.ts

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
        TerminalEmptyState.vue
      model/
        useTerminalWorkbench.ts
    sftp-explorer/
      ui/
        SftpExplorer.vue
        SftpToolbar.vue
        SftpTree.vue
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
    editor-workbench/
      ui/
        EditorWorkbench.vue
        EditorTabs.vue
        CodeEditor.vue
      model/
        useEditorWorkbench.ts

  features/
    session/
      create-session/
      edit-session/
      delete-session/
      connect-session/
      disconnect-session/
      import-ssh-config/
      test-connection/
      move-session-node/
    terminal/
      send-terminal-input/
      resize-terminal/
      search-terminal/
      broadcast-command/
      reconnect-terminal/
    sftp/
      open-directory/
      upload-files/
      download-files/
      rename-file/
      delete-file/
      create-directory/
      remote-search/
      bookmark-path/
    workspace/
      switch-panel/
      open-command-palette/
      quick-open/
      manage-tabs/
      global-shortcuts/
    settings/
      switch-theme/
      update-security-settings/
      update-known-hosts/

  entities/
    session/
      model/
        session.types.ts
        session.schema.ts
        session.selectors.ts
        session.store.ts
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
        terminalEvents.ts
      api/
        terminalRepository.ts
      lib/
        encodeInput.ts
        decodeOutput.ts
        terminalTheme.ts
      index.ts
    sftp/
      model/
        sftp.types.ts
        sftp.store.ts
        sftp.selectors.ts
        sftpPath.ts
        sftpTask.ts
      api/
        sftpRepository.ts
      lib/
        pathUtils.ts
        transferPlanner.ts
        fileSize.ts
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
        layoutPersistence.ts
      index.ts
    settings/
      model/
        settings.types.ts
        settings.store.ts
        settings.selectors.ts
      api/
        settingsRepository.ts
      index.ts

  shared/
    ui/
      button/
      input/
      dialog/
      menu/
      tree/
      tabs/
      tooltip/
      virtual-list/
      empty-state/
      progress/
      icon/
    ipc/
      ipcClient.ts
      ipcContract.ts
      ipcErrors.ts
      ipcEvents.ts
      ipcMock.ts
    platform/
      tauri/
        window.ts
        dialog.ts
        clipboard.ts
        fileSystem.ts
      browser/
        window.ts
    config/
      env.ts
      constants.ts
    lib/
      result.ts
      eventBus.ts
      disposable.ts
      logger.ts
      assertNever.ts
      debounce.ts
      throttle.ts
      createId.ts
    theme/
      tokens.css
      themes/
        dark.css
        light.css
        high-contrast.css
      useTheme.ts
    styles/
      reset.css
      base.css
      typography.css
      animations.css
    testing/
      factories/
      mocks/
      renderWithProviders.ts
```

---

## **架构分层说明**

### **1. App 层**
`app/` 只负责应用级初始化。
职责：
- 初始化 Vue。
- 注册全局 Provider。
- 恢复本地状态。
- 注册 Tauri 事件监听。
- 启动全局快捷键。
- 挂载错误边界。
- 处理应用关闭前清理。

不负责：
- 不写具体会话逻辑。
- 不写 SFTP 上传逻辑。
- 不直接渲染复杂业务树。
- 不直接调用 IPC 命令。

示例：

```ts
// app/lifecycle/bootstrapApp.ts
export async function bootstrapApp() {
  await restoreSettings()
  await restoreWorkspaceLayout()
  await restoreSessionTree()
  registerGlobalShortcuts()
  registerIpcEventListeners()
}
```
`App.vue` 理想状态：
```vue
<template>
  <AppProviders>
    <WorkbenchPage />
  </AppProviders>
</template>
```

---

### **2. Shell 层**

`shell/` 是工作台框架，类似 VS Code/JetBrains 的外壳。

职责：
- 标题栏。
- 活动栏。
- 侧栏。
- 主工作区。
- 状态栏。
- 全局 overlay 容器。
- 布局区域定义。

不负责：
- 不理解“SSH 怎么连接”。
- 不理解“SFTP 怎么上传”。
- 不理解“Session 怎么保存”。

它只关心：
- 当前激活 panel 是什么。
- 当前布局尺寸。
- 是否显示 drawer。
- 哪些全局 overlay 打开。

示例：

```text
WorkbenchShell
  AppTitlebar
  ActivityBar
  SidebarPanelHost
  MainWorkbenchArea
  StatusBar
  DialogHost
  ToastHost
  ContextMenuHost
  CommandPaletteHost
```

---

### **3. Pages 层**
`pages/` 是页面级组合。
对于桌面应用，可能只有一个主要页面：

```text
pages/workbench/WorkbenchPage.vue
```

它负责把 shell 与 widgets 拼起来。

```vue
<template>
  <WorkbenchShell>
    <template #sidebar>
      <SessionExplorer v-if="activePanel === 'sessions'" />
      <SftpExplorer v-if="activePanel === 'sftp'" />
      <TaskCenter v-if="activePanel === 'tasks'" />
    </template>

    <template #main>
      <TerminalWorkbench />
      <EditorWorkbench />
    </template>
  </WorkbenchShell>
</template>
```

---

### **4. Widgets 层**
`widgets/` 是大型业务 UI 块。
例如：
- `SessionExplorer`
- `TerminalWorkbench`
- `SftpExplorer`
- `TaskCenter`
- `EditorWorkbench`

Widget 可以组合多个 feature 和 entity。

例如 `SessionExplorer`：
- 展示 session tree。
- 调用 `connect-session` feature。
- 调用 `create-session` feature。
- 使用 `entities/session` 的 store 和 selector。

但它不应该直接调用 IPC。

---

### **5. Features 层**
`features/` 表示一个明确用户动作。
推荐按“动作”而不是按“组件”划分。

例如：

```text
features/session/connect-session/
  ui/
    ConnectSessionButton.vue
  model/
    connectSession.ts
    useConnectSession.ts
  index.ts
```
`connectSession.ts` 负责一个用例：
```ts
export async function connectSession(sessionId: SessionId): Promise<Result<TerminalId>> {
  const session = sessionStore.getById(sessionId)
  const terminal = await terminalRepository.connect(session)
  terminalStore.add(terminal)
  workspaceStore.activateTerminal(terminal.id)
  return ok(terminal.id)
}
```

这样做的好处：
- 同一个动作可以被按钮、命令面板、快捷键、右键菜单复用。
- 行为集中，避免散落在组件事件里。
- 容易单测。

---

### **6. Entities 层**
`entities/` 是领域模型。
每个实体应包含：
- 类型。
- store。
- selector。
- repository。
- 纯函数。
- 领域校验。
- 状态转换。

例如 `entities/session`：

```text
entities/session/
  model/
    session.types.ts
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
```

推荐原则：
- `types.ts` 不依赖 Vue。
- `sessionTree.ts` 是纯函数。
- `sessionRepository.ts` 是唯一访问持久化/IPC 的入口。
- UI 不能直接修改 session tree，只能通过 actions/use cases。

---

### **7. Shared 层**
`shared/` 是无业务语义的基础设施。
可以包括：
- UI 基础组件。
- IPC client。
- 日志。
- 事件总线。
- 错误模型。
- 主题系统。
- 工具函数。
- 测试辅助。

约束：
- `shared` 不允许 import `entities`。
- `shared` 不允许 import `features`。
- `shared` 不关心 SSH、SFTP、Terminal 等业务概念。

---

## **状态管理设计**

建议采用：

```text
Vue Composition API + 轻量领域 Store + Repository
```

不一定必须引入 Pinia。对于桌面工具类应用，自定义 store 反而更可控。

### **Store 分类**

```text
Persistent Store     持久化状态
Runtime Store        运行时状态
Ephemeral Store      临时 UI 状态
Derived Selectors    派生状态
```

### **Persistent Store**

需要持久化：
- session tree。
- workspace layout。
- theme。
- settings。
- known host 设置。
- recent paths。
- bookmarks。
- editor tabs。
- terminal profile 配置。

```ts
interface PersistentWorkspaceState {
  activePanel: WorkspacePanel
  sidebarWidth: number
  openedTerminalIds: TerminalId[]
  activeTerminalId: TerminalId | null
  openedEditorTabs: EditorTab[]
}
```

### **Runtime Store**

只存在内存：
- SSH 连接状态。
- terminal xterm instance。
- SFTP 当前连接。
- 正在执行的传输任务。
- IPC listener。
- pending interaction。
- drag state。

### **Ephemeral Store**

短生命周期 UI 状态：
- context menu open。
- dialog open。
- command palette query。
- hover popover。
- current drag target。

这些不应该进入持久化。

---

## **Store 示例设计**

```ts
export function createSessionStore() {
  const state = reactive<SessionState>({
    groups: [],
    selectedSessionId: null,
    expandedGroupIds: new Set(),
    loading: false,
    error: null,
  })

  const selectors = {
    allSessions: computed(() => flattenSessionTree(state.groups)),
    selectedSession: computed(() => findSession(state.groups, state.selectedSessionId)),
  }

  const actions = {
    setGroups(groups: SessionGroup[]) {
      state.groups = groups
    },

    addSession(groupId: SessionGroupId, session: Session) {
      state.groups = addSessionToTree(state.groups, groupId, session)
    },

    moveNode(payload: MoveSessionNodePayload) {
      state.groups = moveSessionTreeNode(state.groups, payload)
    },
  }

  return {
    state: readonly(state),
    selectors,
    actions,
  }
}
```

重点：
- 外部不能直接 mutate state。
- 所有变更走 action。
- 树操作放纯函数。
- selector 统一管理派生状态。

---

## **IPC 设计**

Tauri IPC 是前后端边界，必须作为基础设施重点设计。

### **IPC 分层**

```text
shared/ipc/ipcClient.ts        # 低级 typed invoke
entities/*/api/*Repository.ts  # 领域 API 包装
features/*/model/*.ts          # 用户用例调用 repository
widgets/pages                  # 不直接调用 IPC
```

### **IPC Contract**

```ts
export interface IpcContract {
  connect_ssh: {
    args: ConnectSshArgs
    result: ConnectSshResult
  }

  disconnect_ssh: {
    args: DisconnectSshArgs
    result: void
  }

  sftp_list: {
    args: SftpListArgs
    result: SftpListResult
  }
}
```

### **Typed Invoke**

```ts
export async function invokeCommand<K extends keyof IpcContract>(
  command: K,
  args: IpcContract[K]['args'],
): Promise<IpcContract[K]['result']> {
  try {
    return await invoke(command, args)
  } catch (error) {
    throw normalizeIpcError(error)
  }
}
```

### **Repository 示例**

```ts
export const terminalRepository = {
  connect(args: ConnectSshArgs) {
    return invokeCommand('connect_ssh', args)
  },

  disconnect(sessionId: TerminalSessionId) {
    return invokeCommand('disconnect_ssh', { sessionId })
  },

  sendInput(sessionId: TerminalSessionId, data: string) {
    return invokeCommand('send_terminal_input', {
      sessionId,
      dataBase64: encodeBase64(data),
    })
  },
}
```

好处：
- IPC 命令统一类型化。
- 测试时 mock repository，而不是 mock Tauri。
- 错误处理集中。
- 后续可加日志、耗时统计、重试、权限检查。

---

## **事件系统设计**

桌面应用有大量异步事件：
- terminal output。
- SFTP progress。
- SSH interaction。
- window focus/blur。
- file drop。
- task progress。
- reconnect event。
- host key prompt。

推荐设计全局事件网关：

```text
shared/ipc/ipcEvents.ts
app/providers/IpcEventProvider.vue
entities/*/model/*Events.ts
```

### **事件流**

```text
Tauri Event
  -> IpcEventProvider
  -> domain event dispatcher
  -> entity store action
  -> widget UI update
```

示例：

```ts
export function registerTerminalEvents() {
  return listen<TerminalOutputEvent>('terminal://output', event => {
    terminalStore.actions.appendOutput(event.payload.sessionId, event.payload.data)
  })
}
```

每个 listener 必须返回 disposable：

```ts
interface Disposable {
  dispose(): void
}
```

全局关闭时统一清理。

---

## **终端模块设计**

Terminal 是最高复杂度之一，应重点隔离。

### **目标结构**

```text
entities/terminal/
  model/
    terminal.types.ts
    terminal.store.ts
    terminal.selectors.ts
    terminalSession.ts
    terminalEvents.ts
  api/
    terminalRepository.ts
  lib/
    terminalEncoding.ts
    terminalTheme.ts
    terminalInputQueue.ts

widgets/terminal-workbench/
  ui/
    TerminalWorkbench.vue
    TerminalTabs.vue
    TerminalPane.vue
    TerminalViewport.vue
    TerminalSearchPanel.vue
  model/
    useTerminalWorkbench.ts

features/terminal/
  send-terminal-input/
  resize-terminal/
  search-terminal/
  reconnect-terminal/
  broadcast-command/
```

### **Terminal Store**

```ts
interface TerminalState {
  sessions: Record<TerminalId, TerminalSession>
  activeTerminalId: TerminalId | null
  order: TerminalId[]
}

interface TerminalSession {
  id: TerminalId
  sessionId: SessionId
  title: string
  status: TerminalStatus
  cols: number
  rows: number
  cwd?: string
  createdAt: number
  lastActiveAt: number
  reconnectCount: number
}
```

### **xterm 实例管理**

不要把 xterm 实例放进普通 store。

推荐：

```ts
class TerminalInstanceRegistry {
  private instances = new Map<TerminalId, TerminalRuntime>()

  mount(id: TerminalId, element: HTMLElement): void
  unmount(id: TerminalId): void
  write(id: TerminalId, data: string): void
  resize(id: TerminalId, cols: number, rows: number): void
  dispose(id: TerminalId): void
}
```

原因：
- xterm instance 不适合响应式。
- DOM 生命周期与业务状态不同步。
- 避免内存泄漏。
- 方便集中释放 addon。

---

## **SFTP 模块设计**

SFTP 是第二复杂领域，包含树、路径、传输、搜索、任务。

### **目标结构**

```text
entities/sftp/
  model/
    sftp.types.ts
    sftp.store.ts
    sftp.selectors.ts
    sftpPath.ts
    sftpNode.ts
    sftpTask.ts
  api/
    sftpRepository.ts
  lib/
    normalizePath.ts
    sortEntries.ts
    buildTree.ts
    transferPlanner.ts

widgets/sftp-explorer/
  ui/
    SftpExplorer.vue
    SftpToolbar.vue
    SftpBreadcrumbs.vue
    SftpTree.vue
    SftpTreeRow.vue
    SftpTransferPanel.vue
  model/
    useSftpExplorer.ts

features/sftp/
  upload-files/
  download-files/
  open-directory/
  rename-file/
  delete-file/
  create-directory/
  remote-search/
  bookmark-path/
```

### **SFTP Store**

```ts
interface SftpState {
  connections: Record<SftpConnectionId, SftpConnectionState>
  activeConnectionId: SftpConnectionId | null
  tasks: Record<SftpTaskId, SftpTask>
}

interface SftpConnectionState {
  id: SftpConnectionId
  terminalId: TerminalId
  currentPath: string
  entriesByPath: Record<string, SftpEntry[]>
  expandedPaths: Set<string>
  selectedPaths: Set<string>
  loadingPaths: Set<string>
  errorByPath: Record<string, AppError>
  bookmarks: SftpBookmark[]
}
```

### **传输任务设计**

上传/下载/删除递归都应归入统一 Task 模型。

```ts
interface TransferTask {
  id: TaskId
  type: 'upload' | 'download' | 'delete' | 'search'
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  progress: {
    totalBytes?: number
    transferredBytes?: number
    totalItems?: number
    completedItems?: number
  }
  source: string
  target?: string
  error?: AppError
  createdAt: number
  updatedAt: number
}
```

好处：
- TaskCenter 可以统一展示。
- SFTP drawer 可以只展示 mini task。
- 后续支持暂停、重试、队列并发控制。

---

## **Session 模块设计**

Session 是连接配置和导航树的核心。

### **目标结构**

```text
entities/session/
  model/
    session.types.ts
    session.store.ts
    session.selectors.ts
    sessionTree.ts
    sessionValidation.ts
    sessionAuth.ts
  api/
    sessionRepository.ts
  lib/
    createSessionId.ts
    normalizeSession.ts
    importSshConfig.ts

features/session/
  create-session/
  edit-session/
  delete-session/
  connect-session/
  test-connection/
  import-ssh-config/
  move-session-node/

widgets/session-explorer/
  ui/
    SessionExplorer.vue
    SessionTree.vue
    SessionTreeGroup.vue
    SessionTreeSession.vue
    SessionDialog.vue
  model/
    useSessionExplorer.ts
```

### **Session 类型**

```ts
interface Session {
  id: SessionId
  name: string
  host: string
  port: number
  username: string
  auth: SessionAuth
  tags: string[]
  notes?: string
  defaultPath?: string
  terminalProfileId?: TerminalProfileId
  createdAt: number
  updatedAt: number
}

type SessionAuth =
  | { type: 'password'; keyringRef?: string }
  | { type: 'privateKey'; privateKeyPath: string; passphraseKeyringRef?: string }
  | { type: 'agent' }
```

### **Session Tree**

```ts
type SessionTreeNode =
  | SessionGroupNode
  | SessionLeafNode

interface SessionGroupNode {
  type: 'group'
  id: SessionGroupId
  name: string
  children: SessionTreeNode[]
}

interface SessionLeafNode {
  type: 'session'
  id: SessionId
}
```

推荐：
- 树节点只保存引用。
- session 详情放 normalized map。
- 拖拽移动只操作树。
- session 编辑只操作 session map。

这样比把完整 session 嵌入树更稳定。

---

## **Workspace 模块设计**

Workspace 负责工作台布局、tab、panel、激活状态。

```text
entities/workspace/
  model/
    workspace.types.ts
    workspace.store.ts
    workspace.selectors.ts
    layoutPersistence.ts
```

### **Workspace State**

```ts
interface WorkspaceState {
  activePanel: WorkspacePanel | null
  sidebarWidth: number
  bottomPanelHeight: number
  mainAreaMode: 'terminal' | 'editor' | 'split'
  tabs: WorkspaceTab[]
  activeTabId: WorkspaceTabId | null
}

type WorkspacePanel =
  | 'sessions'
  | 'sftp'
  | 'tasks'
  | 'search'
  | 'settings'

type WorkspaceTab =
  | TerminalWorkspaceTab
  | EditorWorkspaceTab
  | WelcomeWorkspaceTab
```

Workspace 不直接关心 SSH 怎么连，只关心：
- 打开了哪个 tab。
- 当前激活哪个 tab。
- 侧栏显示什么。
- 布局尺寸如何保存。

---

## **命令系统设计**

建议引入统一 Command Registry。

类似 VS Code：

```ts
interface Command {
  id: string
  title: string
  category: string
  shortcut?: string
  when?: () => boolean
  run: () => Promise<void> | void
}
```

目录：

```text
features/workspace/command-registry/
  command.types.ts
  commandRegistry.ts
  registerSessionCommands.ts
  registerTerminalCommands.ts
  registerSftpCommands.ts
```

使用场景：
- 命令面板。
- 快捷键。
- 菜单。
- 右键菜单。
- toolbar button。

同一个命令只定义一次。

示例：

```ts
registerCommand({
  id: 'session.connect',
  title: 'Connect to Session',
  category: 'Session',
  shortcut: 'Ctrl+Enter',
  when: () => Boolean(sessionStore.state.selectedSessionId),
  run: () => connectSelectedSession(),
})
```

好处：
- 快捷键和命令面板行为一致。
- 权限/可用状态统一。
- 插件系统未来可直接复用。

### **命令元信息**

命令不只需要 `run`，还需要描述 UI 如何展示和何时可用。

```ts
interface CommandMeta {
  id: string
  title: string
  category: 'Session' | 'Terminal' | 'SFTP' | 'Workspace' | 'Settings'
  description?: string
  icon?: string
  shortcut?: string
  when?: () => boolean
  disabledReason?: () => string | null
  dangerous?: boolean
  visibleInPalette?: boolean
  visibleInMenu?: boolean
}
```

### **快捷键治理**

- 快捷键注册必须走 command registry，不在组件内监听全局快捷键。
- 同一命令可被按钮、菜单、右键菜单、命令面板复用。
- 快捷键冲突在 Settings / Keybindings 中集中展示。
- 文本输入、terminal focus、dialog focus 下应有不同 keybinding scope。
- Terminal 中的快捷键不能轻易覆盖 shell 快捷键，需要定义优先级。

```ts
type KeybindingScope =
  | 'global'
  | 'workbench'
  | 'terminal'
  | 'sftp'
  | 'dialog'
  | 'input'
```

### **命令可用性展示**

- `when=false`：命令不显示或排到结果底部。
- `disabledReason` 有值：命令显示为 disabled，并展示不可用原因。
- `dangerous=true`：菜单中使用 danger 样式，执行前可接 confirm。
- 命令面板搜索结果应优先展示最近使用和当前上下文相关命令。

---

## **Dialog 设计**

不要在业务组件里到处写 dialog state。

推荐全局 Dialog Service：

```ts
const confirmed = await dialog.confirm({
  title: 'Delete file',
  message: 'Are you sure?',
  intent: 'danger',
})
```

实现：

```text
shared/ui/dialog/
  DialogHost.vue
  dialogService.ts
  dialog.types.ts
```

类型：

```ts
interface DialogService {
  confirm(options: ConfirmOptions): Promise<boolean>
  prompt(options: PromptOptions): Promise<string | null>
  selectFile(options: SelectFileOptions): Promise<string[]>
  showError(error: AppError): Promise<void>
}
```

这样 feature 里可以直接写用例逻辑：

```ts
export async function deleteSftpFile(path: string) {
  const confirmed = await dialog.confirm({
    title: 'Delete File',
    message: `Delete ${path}?`,
    intent: 'danger',
  })

  if (!confirmed) return

  await sftpRepository.delete(path)
}
```

---

## **错误模型设计**

必须统一错误结构。

```ts
interface AppError {
  code: string
  message: string
  detail?: string
  cause?: unknown
  severity: 'info' | 'warning' | 'error' | 'fatal'
  recoverable: boolean
  source: 'ipc' | 'ssh' | 'sftp' | 'terminal' | 'ui' | 'unknown'
}
```

统一入口：

```ts
function normalizeError(error: unknown): AppError
```

错误展示分级：
- 表单错误：显示在字段下。
- 操作错误：toast。
- 阻塞错误：dialog。
- 系统错误：error boundary。
- 后台任务错误：task center。

---

## **主题系统设计**

主题不能散落在组件里。

推荐：

```text
shared/theme/
  tokens.css
  themes/
    dark.css
    light.css
    high-contrast.css
  theme.types.ts
  useTheme.ts
```

### **Token 示例**

```css
:root {
  --color-bg-app: #0f172a;
  --color-bg-panel: #111827;
  --color-bg-elevated: #1f2937;

  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #64748b;

  --color-border-subtle: rgba(148, 163, 184, 0.16);
  --color-accent: #38bdf8;

  --size-titlebar-height: 36px;
  --size-activitybar-width: 48px;
  --radius-sm: 4px;
  --radius-md: 8px;
}
```

组件只能使用 token，不直接写业务颜色。

### **扩展 Token 建议**

桌面工作台需要比普通 Web 页面更细的视觉层级，建议 token 按语义划分，而不是按具体组件命名。

```css
:root {
  /* Background */
  --color-bg-app: #0f172a;
  --color-bg-shell: #111827;
  --color-bg-panel: #151e2e;
  --color-bg-workspace: #05080f;
  --color-bg-elevated: #1f2937;
  --color-bg-hover: rgba(148, 163, 184, 0.08);
  --color-bg-selected: rgba(56, 189, 248, 0.14);

  /* Text */
  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #64748b;
  --color-text-disabled: #475569;

  /* Border */
  --color-border-subtle: rgba(148, 163, 184, 0.16);
  --color-border-strong: rgba(148, 163, 184, 0.32);
  --color-focus-ring: rgba(56, 189, 248, 0.72);

  /* Semantic */
  --color-accent: #38bdf8;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #60a5fa;

  /* Terminal */
  --color-terminal-bg: #05080f;
  --color-terminal-selection: rgba(56, 189, 248, 0.28);
  --color-terminal-cursor: #f8fafc;

  /* Size */
  --size-titlebar-height: 36px;
  --size-activitybar-width: 48px;
  --size-sidebar-default-width: 280px;
  --size-sidebar-min-width: 220px;
  --size-sidebar-max-width: 420px;
  --size-statusbar-height: 24px;
  --size-toolbar-height: 32px;
  --size-tab-height: 34px;
  --size-tree-row-height: 28px;
  --size-form-control-height: 32px;

  /* Radius */
  --radius-xs: 3px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;

  /* Shadow */
  --shadow-popover: 0 12px 32px rgba(0, 0, 0, 0.32);
  --shadow-dialog: 0 24px 64px rgba(0, 0, 0, 0.42);

  /* Motion */
  --duration-fast: 100ms;
  --duration-normal: 160ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

### **视觉层级原则**

- App 背景只作为最底层，不承载内容。
- Shell 区域用于标题栏、活动栏、状态栏，颜色略亮于 App 背景。
- Panel 区域用于 Sidebar、TaskCenter、Settings 分组。
- Workspace 区域用于 Terminal/Editor，应该最暗、最安静，突出内容。
- Elevated 区域用于 Dialog、Popover、CommandPalette、ContextMenu。
- Accent 色只用于焦点、选中、主按钮、活动入口，不做大面积装饰。

### **主题落地策略**

主题系统应拆成三层：基础 token、语义 token、组件 token。组件只能使用语义 token 或组件 token，不直接引用原始色值。

```text
基础 token      --slate-900 / --sky-400 / --red-500
语义 token      --color-bg-panel / --color-danger / --color-focus-ring
组件 token      --button-primary-bg / --tree-row-hover-bg / --tab-active-border
```

推荐目录补充：

```text
shared/theme/
  tokens/
    primitive.css        # 原始色板、字号、间距
    semantic.css         # 语义 token
    components.css       # 组件 token
  themes/
    dark.css
    light.css
    high-contrast.css
  density/
    compact.css
    comfortable.css
```

主题切换原则：
- 默认使用 dark theme，适配终端和长时间运维场景。
- light theme 必须保证终端区域仍可独立保持深色。
- high-contrast theme 优先服务可读性，不追求品牌感。
- density 与 theme 分离，用户可以同时选择 dark + comfortable。
- 主题切换不能导致 xterm 重新创建，只更新 xterm theme 配置。

### **字体与排版**

- UI 字体使用系统字体栈，保证 Windows/macOS/Linux 原生感。
- Terminal 字体默认使用等宽字体，建议提供 font family、font size、line height 配置。
- 中文界面字号建议 `12px–14px`，密集列表默认 `12px`，正文说明默认 `13px`。
- 标题不宜过大，桌面工具中 panel title 建议 `12px–13px` 加粗。
- 数字信息如速度、大小、耗时建议使用 tabular-nums，减少进度刷新抖动。

```css
:root {
  --font-ui: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "Cascadia Mono", "JetBrains Mono", "Fira Code", Consolas, monospace;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 13px;
  --font-size-lg: 14px;
  --line-height-dense: 1.35;
  --line-height-normal: 1.5;
}
```

---

## **UI 布局规范**

VRShell 应按轻量 IDE / 远程运维工作台设计，而不是普通后台页面。布局由 `shell` 统一承载，业务 widget 只填充对应区域。

### **Workbench 标准结构**

```text
┌──────────────────────────────────────────────────────────────┐
│ AppTitlebar                                                  │ 36px
├──────┬──────────────────────┬────────────────────────────────┤
│      │ Sidebar              │ MainWorkbenchArea              │
│ Act  │ Session/SFTP/Tasks   │ TerminalTabs / EditorTabs      │
│ Bar  │ Search/Settings      │ TerminalPane / EditorPane      │
│ 48px │ 220–420px            │ flexible                       │
├──────┴──────────────────────┴────────────────────────────────┤
│ StatusBar                                                    │ 24px
└──────────────────────────────────────────────────────────────┘
```

### **区域职责**

- `AppTitlebar`：窗口拖拽、应用标题、工作区切换、全局命令入口、窗口控制。
- `ActivityBar`：一级功能入口，只放图标，文本通过 tooltip 展示。
- `Sidebar`：承载当前激活 panel，宽度可拖拽并持久化。
- `MainWorkbenchArea`：承载 Terminal、Editor、Welcome、Settings 等主内容 tab。
- `BottomPanel`：可选区域，用于 Problems、Output、Logs、Task Detail，不默认常驻。
- `StatusBar`：展示连接状态、当前主机、任务数量、布局状态、日志入口。
- `Overlays`：Dialog、Toast、ContextMenu、CommandPalette 统一挂载在 shell 顶层。

### **推荐尺寸**

| 区域 | 默认尺寸 | 说明 |
| --- | --- | --- |
| Titlebar | `36px` | 保持桌面应用紧凑感 |
| ActivityBar | `48px` | 只展示图标入口 |
| Sidebar | `280px` | 支持 `220px–420px` 拖拽 |
| StatusBar | `24px` | 只放短状态，不承载复杂交互 |
| Toolbar | `32px` | Session/SFTP 工具栏统一高度 |
| Tab | `34px` | 支持关闭、状态点、右键菜单 |
| Tree Row | `28px` | 适合密集桌面列表 |
| Form Control | `32px` | 设置页和弹窗表单统一高度 |

### **响应与缩放**

- 窗口宽度小于 `900px` 时，Sidebar 可自动折叠为 drawer。
- 窗口高度小于 `640px` 时，BottomPanel 默认收起。
- Sidebar 和 BottomPanel 尺寸变化应节流保存，避免频繁持久化。
- 终端区域 resize 后应通过 feature 触发 terminal resize，不在组件中直接操作 IPC。
- Split pane 拖拽时只更新临时 UI 状态，拖拽结束后再持久化布局。

### **布局状态建议**

```ts
interface WorkspaceLayoutState {
  sidebarVisible: boolean
  sidebarWidth: number
  activePanel: WorkspacePanel | null
  bottomPanelVisible: boolean
  bottomPanelHeight: number
  mainAreaMode: 'single' | 'horizontal-split' | 'vertical-split'
  density: 'compact' | 'comfortable'
}
```

---

## **关键页面线框**

### **Workbench 首页**

```text
Titlebar:  VRShell  [Workspace]              [Command...] [-][□][x]
Activity:  Sessions | SFTP | Tasks | Search | Settings
Sidebar:   当前 panel 内容
Main:      Welcome / Terminal tabs / Editor tabs
Status:    SSH: idle | Tasks: 0 | Theme: Dark | Logs
```

首页空状态不要空白，应给出 3 个高频入口：
- 新建 SSH Session。
- 导入 SSH Config。
- 打开命令面板。

### **SessionExplorer**

```text
┌────────────────────────────┐
│ Sessions        [+] [import]│
│ [Search sessions     Ctrl+F]│
├────────────────────────────┤
│ ▾ Production               │
│   ● api-prod-01            │
│   ● db-prod-01             │
│ ▸ Staging                  │
│ ▸ Local                    │
├────────────────────────────┤
│ Recent: api-prod-01        │
└────────────────────────────┘
```

设计要点：
- 连接状态用小圆点表达，避免整行高饱和颜色。
- 节点 hover 显示快速操作，如 connect、edit、more。
- 右键菜单包含 connect、open sftp、duplicate、rename、delete。
- 拖拽移动时显示清晰 drop indicator，不只依赖背景色。

### **TerminalWorkbench**

```text
┌────────────────────────────────────────────┐
│ ● api-prod-01  ×  ○ local  ×      [+] [⋯] │
├────────────────────────────────────────────┤
│                                            │
│              xterm viewport                │
│                                            │
└────────────────────────────────────────────┘
```

设计要点：
- 当前 tab 使用顶部细线或 accent 下划线表示。
- 连接状态点区分 connecting、connected、warning、disconnected。
- 搜索框使用右上角浮层，不挤占终端固定高度。
- 连接失败在 pane 内展示错误空状态，提供 Retry、Edit Session、View Log。

### **SftpExplorer**

```text
┌────────────────────────────────────────────┐
│ SFTP: api-prod-01       [upload] [refresh] │
│ / home / deploy / app                      │
├────────────────────────────────────────────┤
│ Name              Size      Modified       │
│ ▸ logs            —         2026-06-21     │
│   app.tar.gz      28 MB     2026-06-21     │
│   README.md       3 KB      2026-06-20     │
├────────────────────────────────────────────┤
│ Uploading app.tar.gz  48%  2.4 MB/s        │
└────────────────────────────────────────────┘
```

设计要点：
- 支持树模式和列表模式，列表模式显示 size、mtime、permission。
- 面包屑每段可点击，末尾支持直接输入路径。
- 上传下载进度在 SFTP 面板底部显示 mini task，同时同步到 TaskCenter。
- 权限错误、空目录、断开连接使用不同 empty/error state。

### **SettingsPage**

Settings 不建议塞进窄 Sidebar，应作为主工作区 tab 或独立 page。

```text
┌────────────────────────────────────────────┐
│ Settings                                   │
├──────────────┬─────────────────────────────┤
│ General      │ Theme                       │
│ Terminal     │ [Dark        v]             │
│ SSH          │ Font size [14]              │
│ SFTP         │ Cursor style [Block]        │
│ Keybindings  │                             │
│ Security     │                             │
└──────────────┴─────────────────────────────┘
```

设计要点：
- 左侧设置分组固定，右侧表单滚动。
- 高风险设置放在 Security 分组，并使用 warning/danger 语义提示。
- 修改后立即生效的设置应有轻量反馈；需要重启的设置应明确标注。

### **ActivityBar**

```text
┌──────┐
│  ⛓  │ Sessions
│  ⇄  │ SFTP
│  ✓  │ Tasks
│  🔎 │ Search
│  ⚙  │ Settings
└──────┘
```

设计要点：
- 只展示图标，不常驻文字，降低横向空间占用。
- active item 使用左侧 `2px` accent 线 + 背景变化。
- 有运行任务或错误时可显示 badge，但 badge 数量最多两位，超过显示 `99+`。
- hover 显示 tooltip，tooltip 内容包含名称和快捷键。
- Settings 建议固定在底部，业务入口放上方。

### **StatusBar**

```text
SSH: connected  api-prod-01  |  Tasks: 2  |  Layout saved  |  Logs ⚠
```

设计要点：
- 左侧显示连接/主机上下文，中间显示任务和传输状态，右侧显示日志、主题、布局状态。
- 状态项必须短，不承载长文本；长信息进入 tooltip 或日志面板。
- 异常状态使用 warning/danger 小图标，不用整条状态栏变色。
- 点击 `Tasks` 打开 TaskCenter，点击 `Logs` 打开底部 Logs panel。

### **CommandPalette**

```text
┌────────────────────────────────────────────┐
│ > connect api                              │
├────────────────────────────────────────────┤
│ Session: Connect to api-prod-01   Ctrl+↵  │
│ SFTP: Open /home/deploy                    │
│ Terminal: Broadcast command                │
└────────────────────────────────────────────┘
```

设计要点：
- 宽度建议 `640px`，最大不超过视口宽度的 `80%`。
- 输入框固定在顶部，结果列表虚拟化。
- 结果项显示 category、title、description、shortcut。
- 支持最近命令、模糊搜索、空结果提示。
- disabled command 可以展示但降低透明度，并说明不可用原因。

---

## **核心用户工作流**

### **首次启动**

```text
启动应用
  -> 恢复设置和布局
  -> 如果没有 session，显示 Welcome empty state
  -> 用户选择新建 Session 或导入 SSH Config
  -> 创建后自动选中 session
  -> 提示可直接连接或打开设置
```

体验要求：
- 首屏不应出现空白工作台。
- 导入 SSH Config 后应显示导入摘要：成功数量、跳过数量、失败原因。
- 第一次连接前可以引导用户配置默认终端字体和主题，但不要阻塞主流程。

### **连接 SSH**

```text
选择 Session
  -> 点击 Connect / Enter / CommandPalette
  -> 打开 Terminal tab
  -> tab 显示 connecting 状态
  -> 连接成功后写入 terminal output
  -> 连接失败时 pane 内展示错误和恢复动作
```

体验要求：
- 用户发起连接后立即创建 tab，避免等待期间无反馈。
- 同一个 session 重复连接时应询问复用、打开新 tab 或 split。
- 连接成功后 StatusBar 更新当前主机和连接状态。
- known host、认证失败、网络超时要有不同错误文案。

### **浏览 SFTP**

```text
从 Session 打开 SFTP
  -> 复用 SSH 连接或建立 SFTP 连接
  -> 显示路径面包屑和文件列表 skeleton
  -> 加载目录完成
  -> 用户上传/下载/重命名/删除
  -> 任务进入 mini progress 和 TaskCenter
```

体验要求：
- 目录切换时保留旧列表直到新列表返回，避免闪屏。
- 失败时保留当前路径上下文，允许刷新或返回上级。
- 大目录默认按目录优先、名称排序，并允许切换排序字段。
- 上传冲突必须提供 overwrite、skip、rename 策略。

### **处理后台任务**

```text
开始上传/下载
  -> SFTP mini progress 显示当前任务
  -> TaskCenter 汇总所有任务
  -> StatusBar 显示任务数量和异常 badge
  -> 完成后保留短暂成功状态
  -> 失败任务提供 retry / copy error
```

体验要求：
- 任务不可只靠 toast 表达，必须有可回看的 TaskCenter。
- 长任务可后台运行，用户切换 panel 不应丢失进度。
- 取消任务要区分 user canceled 和 failed。

### **恢复工作区**

```text
关闭应用
  -> 保存布局、打开 tabs、active panel、主题、density
重新启动
  -> 恢复 shell 布局
  -> 恢复 tab skeleton
  -> 对需要重连的 terminal 标记 disconnected
  -> 用户手动 reconnect
```

体验要求：
- 不建议启动后自动重连所有 SSH，避免风险和性能问题。
- 恢复 tab 时应清楚显示 disconnected/reconnect 状态。
- 如果持久化版本不兼容，使用 migration，失败则回退默认布局并提示。

---

## **交互状态规范**

所有基础组件和业务 widget 都要覆盖以下状态，避免实现时各写各的。

### **基础状态**

| 状态 | 表现 |
| --- | --- |
| Default | 默认背景和文本，不制造额外视觉噪音 |
| Hover | 使用 `--color-bg-hover`，不改变布局尺寸 |
| Active | 操作瞬间略微加深背景或降低亮度 |
| Selected | 使用 `--color-bg-selected` 和 accent 细线 |
| Focused | 使用 `--color-focus-ring`，键盘可见 |
| Disabled | 降低文本和图标对比度，禁止 hover 强反馈 |
| Loading | 局部 skeleton、spinner 或 progress，不阻塞整个工作台 |
| Error | 使用语义 danger，并提供恢复动作 |
| Empty | 解释原因并给出下一步动作 |

### **键盘与快捷键**

- `Ctrl+Shift+P` 打开命令面板。
- `Ctrl+P` 快速打开 session、文件或命令。
- `Ctrl+F` 在当前上下文搜索，Terminal/SFTP/Session 各自处理。
- `Ctrl+W` 关闭当前 tab。
- `Ctrl+Tab` 切换最近 tab。
- `F2` 重命名选中 session 或 SFTP 文件。
- `Delete` 删除当前选中项，但必须经过确认或可撤销流程。

### **右键菜单**

- Session 节点：connect、open terminal、open sftp、edit、duplicate、rename、delete。
- Terminal tab：rename、duplicate、split right、split down、reconnect、close others。
- SFTP 文件：open、download、rename、delete、copy path、properties。
- Task 项：pause/resume、cancel、retry、show detail、copy error。

### **反馈分级**

- 即时成功反馈：优先使用状态变化，不一定 toast。
- 普通失败：toast + 可点击查看详情。
- 阻塞失败：dialog，必须提供下一步动作。
- 长任务：TaskCenter + 局部 mini progress。
- 后台异常：StatusBar 日志入口显示 warning badge。

### **加载状态**

不同场景应使用不同加载表达，避免全局 spinner 滥用。

| 场景 | 推荐表现 |
| --- | --- |
| 应用启动 | Workbench skeleton + 状态文字 |
| Session tree 加载 | Tree 区域 skeleton row |
| SFTP 目录加载 | 文件列表 skeleton row + 当前路径保留 |
| Terminal 连接中 | Tab 状态点闪烁 + Pane 内 connecting 文案 |
| 上传下载 | Progress bar + 速度 + 剩余时间 |
| 命令面板搜索 | 局部 loading indicator，不阻塞输入 |

加载原则：
- 小于 `300ms` 的操作不显示 loading，避免闪烁。
- 超过 `800ms` 的操作必须显示可理解状态文案。
- 超过 `5s` 的操作必须提供取消、查看日志或后台运行选项。
- 加载时保留旧内容优先于清空内容，减少工作台跳动。

### **空态规范**

空态必须解释“为什么为空”和“下一步做什么”。

| 位置 | 文案方向 | 主操作 |
| --- | --- | --- |
| Welcome | 尚未打开工作区或连接 | 新建 Session |
| Sessions | 还没有 SSH 会话 | 新建 / 导入 SSH Config |
| SFTP | 未选择连接或目录为空 | 选择 Session / 上传文件 |
| Tasks | 当前没有后台任务 | 无主按钮，显示说明即可 |
| Search | 没有匹配结果 | 清空搜索 / 调整关键词 |
| Terminal | 连接已断开或失败 | 重连 / 编辑 Session / 查看日志 |

空态 UI 结构：

```text
[轻量图标]
标题：一句话说明状态
描述：补充原因或上下文
主操作：下一步动作
次操作：可选，例如导入、查看文档、打开日志
```

### **错误态规范**

错误信息应分层展示，既不吞掉细节，也不把底层错误直接暴露给普通用户。

```ts
interface UiErrorPresentation {
  title: string
  message: string
  detail?: string
  primaryAction?: UiAction
  secondaryAction?: UiAction
  copyableDetail?: string
}
```

错误展示建议：
- 表单校验错误显示在字段下方。
- SSH 连接失败显示在 TerminalPane 内，同时提供重试和查看日志。
- SFTP 权限错误显示在文件列表区域，不清空当前连接上下文。
- 删除、覆盖、断开连接等危险操作必须有 confirm 或 undo。
- 未知错误必须可复制 detail，便于用户反馈问题。

### **危险操作确认**

| 操作 | 推荐机制 |
| --- | --- |
| 删除 Session | Confirm dialog，显示 session 名称 |
| 删除远程文件 | Confirm dialog，显示完整路径 |
| 覆盖远程文件 | Conflict dialog，支持 overwrite / skip / rename |
| 断开活跃连接 | Confirm 或可恢复 toast，取决于是否有运行任务 |
| 清空 known hosts | 强确认，要求二次确认或输入关键词 |

---

## **UI 组件设计**
`shared/ui` 应该是无业务组件库。
推荐基础组件：
- `UiButton`
- `UiIconButton`
- `UiInput`
- `UiSelect`
- `UiCheckbox`
- `UiDialog`
- `UiMenu`
- `UiTooltip`
- `UiTabs`
- `UiTree`
- `UiVirtualList`
- `UiProgress`
- `UiEmptyState`
- `UiPopover`
- `UiSplitPane`

原则：
- 不包含 session/sftp/terminal 字样。
- 支持 keyboard navigation。
- 支持 aria。
- 支持密集桌面 UI。
- 支持 virtualized list/tree。
- 支持 compact 和 comfortable 两种密度。
- 只暴露通用 props、slots、events，不内置业务动作。

### **基础组件变体**

`UiButton`：
- `primary`：主操作，例如 connect、save。
- `secondary`：次级操作，例如 cancel、refresh。
- `ghost`：toolbar 和 tree row 内的轻量操作。
- `danger`：删除、断开、清理等高风险操作。
- `icon`：只含图标，必须配合 tooltip 或 aria-label。

`UiInput`：
- 支持 prefix/suffix icon。
- 支持 clearable。
- 支持 error message。
- 支持 shortcut hint，例如搜索框显示 `Ctrl+F`。
- 支持 password reveal，用于密钥密码等场景。

`UiTabs`：
- 支持 closable、pinned、dirty、loading、status indicator。
- 支持右键菜单和拖拽排序。
- 支持 overflow 后进入更多菜单。
- active tab 必须可通过键盘切换。

`UiMenu` / `UiContextMenu`：
- 支持 icon、shortcut、disabled、danger、separator。
- 支持子菜单，但不建议超过两级。
- 菜单项高度默认 `28px`，适配密集桌面 UI。

`UiDialog`：
- `confirm`、`prompt`、`form`、`error` 四类基础模式。
- danger 操作按钮必须位于确认区，并使用明确文案。
- 表单 dialog 宽度建议 `480px–640px`，复杂设置不要放 dialog。

### **可访问性要求**

- 所有 icon-only button 必须有 `aria-label`。
- Focus ring 只在键盘导航时明显显示，鼠标点击不制造额外噪音。
- Tree、Menu、Tabs 必须支持方向键导航。
- Dialog 打开后焦点必须 trap 在弹窗内，关闭后返回触发元素。
- 颜色不能是唯一状态表达，错误、选中、连接状态都需要形状或文本辅助。

### **组件规格矩阵**

| 组件 | 必需能力 | 桌面增强 |
| --- | --- | --- |
| `UiButton` | variant、size、disabled、loading | icon-only、tooltip、danger confirm hook |
| `UiInput` | value、placeholder、disabled、error | clearable、shortcut hint、prefix/suffix |
| `UiSelect` | options、value、disabled | searchable、keyboard navigation、empty state |
| `UiTabs` | active、close、reorder | pinned、dirty、status、overflow menu |
| `UiTree` | expand、select、keyboard | virtualized、drag hint、context menu |
| `UiVirtualList` | item height、overscan、scrollTo | dynamic measure、sticky header |
| `UiDialog` | title、content、actions | focus trap、danger mode、copy detail |
| `UiMenu` | items、disabled、shortcut | nested menu、danger item、typeahead |
| `UiTooltip` | content、placement | delay、shortcut display、disabled wrapping |
| `UiSplitPane` | direction、size、resize | min/max、collapse、persist callback |
| `UiEmptyState` | title、description、action | icon、secondary action、compact mode |
| `UiProgress` | value、status | speed、eta、cancel action |

### **组件 API 设计原则**

- 组件 props 使用受控模式优先，例如 `modelValue` + `update:modelValue`。
- 复杂内容通过 slot 注入，不在基础组件内耦合业务结构。
- 组件事件只描述用户意图，例如 `select`、`close`、`resize-end`，不直接执行业务动作。
- 尺寸统一使用 `size="xs|sm|md"` 或 density provider，不让调用方随意写高度。
- 禁止在基础组件中直接访问 store、router、IPC、command registry。

示例：

```vue
<UiTabs
  :items="tabs"
  :active-id="activeTabId"
  reorderable
  @activate="activateTab"
  @close="closeTab"
  @reorder="reorderTabs"
>
  <template #item="{ item }">
    <TabLabel :tab="item" />
  </template>
</UiTabs>
```

### **组件测试要求**

基础 UI 组件至少覆盖：
- 渲染默认态和关键 variant。
- disabled/loading 状态是否阻止交互。
- keyboard navigation 是否可用。
- aria 属性是否存在。
- slot 内容是否正常渲染。
- 关键事件是否只触发一次。

复杂组件额外覆盖：
- `UiTabs`：关闭、排序、overflow、键盘切换。
- `UiTree`：展开折叠、选择、虚拟滚动、拖拽提示。
- `UiDialog`：focus trap、Esc 关闭、危险确认。
- `UiSplitPane`：拖拽、min/max、resize-end 持久化回调。

---

## **虚拟树设计**

Session tree 和 SFTP tree 都可能很大，应抽象为通用虚拟树。

```ts
interface TreeNode<T = unknown> {
  id: string
  parentId: string | null
  depth: number
  expanded: boolean
  selected: boolean
  disabled?: boolean
  data: T
}
```
`UiVirtualTree` 只负责：
- 扁平节点渲染。
- 键盘导航。
- 展开/折叠事件。
- 选择事件。
- drag hint。
- scroll virtualization。

业务层负责：
- 节点内容。
- 节点菜单。
- 节点动作。
- 数据加载。

---

## **表单设计**

Session 创建/编辑应使用领域 schema，而不是组件内部散装规则。

```text
entities/session/model/session.schema.ts
features/session/create-session/model/useSessionForm.ts
```

示例：

```ts
interface FieldError {
  field: string
  message: string
}

function validateSessionDraft(draft: SessionDraft): FieldError[] {
  const errors: FieldError[] = []

  if (!draft.name.trim()) {
    errors.push({ field: 'name', message: 'Name is required' })
  }

  if (!isValidHost(draft.host)) {
    errors.push({ field: 'host', message: 'Invalid host' })
  }

  return errors
}
```

---

## **设置与偏好设计**

Settings 应拆成可独立维护的设置域，避免一个大表单承载所有配置。

```ts
interface UiSettings {
  theme: 'dark' | 'light' | 'high-contrast' | 'system'
  density: 'compact' | 'comfortable'
  language: 'zh-CN' | 'en-US'
  reduceMotion: boolean
}

interface TerminalSettings {
  fontFamily: string
  fontSize: number
  lineHeight: number
  cursorStyle: 'block' | 'bar' | 'underline'
  cursorBlink: boolean
  scrollback: number
  copyOnSelect: boolean
  rightClickBehavior: 'menu' | 'paste'
}

interface WorkspaceSettings {
  restoreTabsOnStartup: boolean
  confirmBeforeDisconnect: boolean
  openSftpInSidebar: boolean
  defaultSplitDirection: 'right' | 'down'
}
```

### **设置分组**

| 分组 | 内容 |
| --- | --- |
| General | 语言、启动行为、更新策略 |
| Appearance | 主题、密度、动效、字体大小 |
| Terminal | 字体、光标、复制粘贴、滚动缓冲 |
| SSH | known hosts、认证方式、连接超时 |
| SFTP | 默认路径、冲突策略、并发传输数 |
| Keybindings | 快捷键查看、搜索、冲突提示 |
| Security | 敏感信息存储、清理缓存、危险操作确认 |

### **设置交互原则**

- 能即时生效的设置立即应用，例如 theme、density、font size。
- 影响连接或后端行为的设置需要明确提示是否对现有连接生效。
- 高风险设置需要说明后果，例如清空 known hosts、关闭确认提示。
- 快捷键冲突必须在保存前提示，不能静默覆盖。
- 设置搜索应支持中文、英文和 command id。

---

## **持久化设计**

推荐统一持久化网关：

```text
shared/persistence/
  persistenceClient.ts
  migrations.ts
  storageKeys.ts
```

持久化数据必须有版本：

```ts
interface PersistedStateEnvelope<T> {
  version: number
  data: T
  updatedAt: number
}
```

支持 migration：

```ts
const migrations = {
  1: migrateV1ToV2,
  2: migrateV2ToV3,
}
```

不要让每个组件自己读写 localStorage 或 IPC。

---

## **性能设计**

重点场景：
- 终端输出高频。
- SFTP 大目录。
- Session tree 拖拽。
- 命令面板搜索。
- Task progress 高频更新。

策略：
- Terminal output 不走 Vue 响应式数组，直接写入 xterm instance。
- SFTP tree 使用虚拟列表。
- Task progress 节流到 100–250ms 更新 UI。
- Command palette 索引预计算。
- 大对象 store normalized。
- 高频事件用 event queue/batch。
- xterm instance 单独 registry 管理。
- 拖拽状态最小化，只保存当前 drag id 和 target id。

### **UI 性能预算**

| 场景 | 目标 |
| --- | --- |
| 应用冷启动到空工作台 | `< 1500ms` |
| 打开命令面板 | `< 100ms` |
| Session 搜索响应 | `< 100ms` |
| SFTP 目录 5000 项滚动 | 稳定 `50–60fps` |
| Terminal 高频输出 | 不触发 Vue 大规模重渲染 |
| 拖拽 split pane | 稳定 `50–60fps` |
| Task progress 刷新 | UI 更新间隔 `100–250ms` |

UI 性能实践：
- hover、selected、focused 状态优先通过 CSS class 表达。
- 大列表不要在 row 内创建昂贵 computed。
- context menu、tooltip、popover 使用延迟挂载。
- 拖拽 resize 过程中只更新视觉尺寸，结束后再写 store。
- 不在 terminal output、transfer progress 中写深层响应式对象。

---

## **设计验收清单**

每个 UI milestone 完成前，应按以下清单自查，避免只完成组件功能但体验不完整。

### **视觉验收**

- 所有颜色来自 theme token，不出现组件内硬编码业务颜色。
- dark、light、high-contrast 三种主题下文字对比度可读。
- compact 和 comfortable density 下布局不溢出。
- hover、selected、focused、disabled 状态清晰可辨。
- Terminal 区域在 light theme 下仍保持高可读性。
- 弹层阴影、边框、背景层级一致，不出现多个视觉系统。

### **布局验收**

- `1024×768` 下核心功能可用。
- Sidebar 可拖拽、折叠、恢复。
- BottomPanel 不遮挡 Terminal 输入区域。
- Split pane resize 后 terminal 能正确 fit。
- CommandPalette、Dialog、ContextMenu 不被窗口边缘裁切。
- 多 tab、长 tab 名称、overflow 场景可用。

### **交互验收**

- 所有 icon-only button 有 tooltip 和 aria-label。
- 主流程可通过键盘完成：搜索 session、连接、切换 tab、关闭 tab。
- 右键菜单在 Session、Terminal tab、SFTP 文件、Task 项上都可用。
- 危险操作有确认、撤销或明确后果说明。
- 长任务切换面板后进度不丢失。
- 错误信息提供恢复动作或复制详情。

### **性能验收**

- Terminal 高频输出不会导致 Vue 大面积重渲染。
- SFTP 大目录使用虚拟列表，滚动不卡顿。
- 命令面板打开和输入响应无明显延迟。
- Task progress 高频更新经过节流。
- 拖拽 resize、拖拽 tree node 不触发昂贵持久化。

### **可访问性验收**

- Dialog focus trap 正常，Esc 可关闭非强制弹窗。
- Tree、Tabs、Menu 支持方向键和 Enter/Escape。
- Focus ring 在键盘导航时可见。
- 颜色不是唯一状态表达，状态点需要 tooltip 或文本辅助。
- high-contrast theme 下 selected、focused、error 状态可区分。

### **文案验收**

- 空态文案说明原因，并提供下一步动作。
- 错误文案避免直接暴露底层异常作为标题。
- 按钮文案使用动词，危险操作明确对象名称。
- Toast 文案短，详细信息进入日志或详情面板。
- 中英文文案长度变化不会破坏布局。

---

## **测试设计**

### **测试金字塔**

```text
Unit Tests       领域纯函数、store、use case
Component Tests 复杂 widget 和 feature UI
E2E Tests        关键用户路径
Smoke Tests      启动、连接、打开主要面板
```

### **建议测试范围**
`entities/session`：
- session validation。
- tree move。
- import ssh config。
- selector。
`entities/sftp`：
- path normalize。
- tree build。
- sort entries。
- transfer planner。
`entities/terminal`：
- input encoding。
- connection state transitions。
- terminal event handling。
`features`：
- connect session 成功/失败。
- upload file 成功/取消/失败。
- delete remote file confirm flow。
- command execution when disabled/enabled。
`widgets`：
- SessionExplorer tree rendering。
- SessionExplorer selected/focused/drag indicator 状态。
- SftpExplorer loading/error/empty state。
- SftpExplorer breadcrumb、file list、mini task progress。
- TerminalWorkbench tab switch。
- TerminalWorkbench disconnected/error recovery state。
`shared/ui`：
- UiButton variants、loading、disabled。
- UiInput clearable、error、shortcut hint。
- UiTabs keyboard、close、reorder、overflow。
- UiTree keyboard、virtual scroll、context menu trigger。
- UiDialog focus trap、Esc、danger action。
- UiSplitPane drag、min/max、resize-end。
`e2e`：
- 启动应用。
- 创建 session。
- 打开 terminal tab。
- 打开 SFTP panel。
- 执行命令面板操作。
- 修改主题。
- 调整 sidebar 和 split pane，并验证布局恢复。
- 使用键盘完成 tab 切换、搜索、关闭。
- 关闭 tab。
`a11y`：
- icon-only button 有 aria-label。
- Dialog focus trap 正常。
- Tree/Menu/Tabs 可键盘导航。
- 高对比主题下主要状态可辨识。

---

## **命名规范**

### **文件命名**

```text
PascalCase.vue         Vue 组件
camelCase.ts           普通 TS 文件
*.types.ts             类型
*.store.ts             store
*.selectors.ts         selector
*.repository.ts        IPC/API 包装
*.schema.ts            校验 schema
*.test.ts              单测
```

### **组件命名**

```text
SessionExplorer.vue
SessionTree.vue
SessionTreeNode.vue
SftpExplorer.vue
TerminalWorkbench.vue
```

### **Feature 命名**

```text
connect-session
upload-files
open-command-palette
broadcast-command
```

### **Command ID**

```text
session.connect
session.create
terminal.close
terminal.broadcastCommand
sftp.upload
sftp.download
workspace.toggleSidebar
settings.open
```

---

## **依赖约束**

建议用 ESLint 或自定义脚本约束：

```text
shared 不得 import entities/features/widgets/pages/app
entities 不得 import features/widgets/pages/app
features 不得 import widgets/pages/app
widgets 不得 import pages/app
```

禁止：
- `shared` 引用业务类型。
- `entities` 引用 Vue 组件。
- `repository` 引用 UI。
- 组件直接调用 `invoke`。
- 组件直接操作 localStorage。
- feature 中直接操作 DOM。
- store 中保存 xterm instance 这类不可序列化复杂对象。

---

## **推荐技术选择**

### **继续使用**
- Vue 3 Composition API
- TypeScript
- Vite
- Vitest
- Playwright
- Tauri IPC typed wrapper
- xterm.js
- CodeMirror

### **可以考虑引入**
- Pinia：如果团队习惯标准 store。
- Zod/Valibot：用于表单和 IPC payload 校验。
- TanStack Virtual：如果自研虚拟树成本过高。
- Fuse.js：命令面板/快速打开模糊搜索。
- mitt 或自研 typed event bus：轻量事件系统。
- VueUse：窗口尺寸、快捷键、节流等通用能力。

### **不建议一开始引入**
- 大型状态机库，除非连接状态极其复杂。
- 大型 UI 框架，桌面工作台通常需要高度定制。
- GraphQL/React Query 类方案，Tauri 本地 IPC 场景收益有限。
- 过早插件系统，先把 command registry 做好即可。

---

## **推荐最终数据流**

以“连接一个 SSH 会话”为例：

```text
User clicks session node
  -> widgets/session-explorer
  -> features/session/connect-session
  -> entities/session selector 获取 session
  -> entities/terminal repository 调用 IPC
  -> backend 返回 terminal session id
  -> entities/terminal store 添加 terminal
  -> entities/workspace store 打开 tab
  -> TerminalWorkbench 渲染 TerminalPane
  -> TerminalViewport mount xterm instance
  -> IpcEventProvider 接收 terminal output
  -> TerminalInstanceRegistry.write()
```

关键点：
- UI 不知道 IPC。
- IPC 不知道 UI。
- Store 不持有 xterm instance。
- Output 不经过重型响应式链路。
- Workspace 只管 tab，不管 SSH 细节。

---

## **推荐实施路线**

如果是完全重做，建议分 6 个里程碑。

### **M1：基础设施**
- 搭建 `app`、`shell`、`shared`。
- 完成 typed IPC。
- 完成 theme token、density token 和基础视觉规范。
- 完成 WorkbenchShell 标准布局。
- 完成空态、错误态、加载态基础组件。
- 完成 dialog/toast/context menu host。
- 完成 command registry。
- 完成基础 UI 组件和组件规格测试。

交付物：
- 应用可启动。
- 空工作台可显示。
- ActivityBar、Sidebar、MainWorkbenchArea、StatusBar 布局稳定。
- 命令面板可打开。
- 主题可切换。
- IPC mock 可测试。

---

### **M2：Session 管理**
- 建立 `entities/session`。
- 实现 session tree normalized model。
- 实现 create/edit/delete/move/import。
- 实现 SessionExplorer。
- 实现持久化和 migration。

交付物：
- 可以创建、编辑、删除、拖拽会话。
- 可以导入 SSH config。
- 可以搜索 session。
- Session tree 具备 selected、focused、hover、drag indicator 状态。
- 单测覆盖 tree 和 validation。

---

### **M3：Terminal**
- 建立 `entities/terminal`。
- 实现 terminal repository。
- 实现 TerminalInstanceRegistry。
- 实现 TerminalWorkbench。
- 实现 connect/disconnect/reconnect。
- 实现 resize/input/output/search。

交付物：
- 可以打开多个终端 tab。
- 可以切换/关闭 terminal。
- Terminal tab 显示连接状态、关闭、右键菜单。
- 终端输出性能稳定。
- 连接失败有明确错误提示和恢复动作。

---

### **M4：SFTP**
- 建立 `entities/sftp`。
- 实现连接复用。
- 实现 directory listing。
- 实现 SftpExplorer。
- 实现 upload/download/delete/rename/mkdir。
- 实现 TaskCenter。

交付物：
- 可以浏览远程文件。
- 可以上传下载。
- SFTP 支持面包屑、列表列信息、mini task progress。
- 可以查看任务进度。
- 可以取消/重试任务。

---

### **M5：Workspace 体验**
- 完成 sidebar/activity bar。
- 完成 workspace tabs。
- 完成 quick open。
- 完成快捷键系统和 keybinding scope。
- 完成窗口菜单。
- 完成布局持久化和启动恢复。
- 完成 Settings 分组、搜索和快捷键冲突提示。
- 完成全局错误处理。

交付物：
- 接近 IDE 的完整操作体验。
- 快捷键、菜单、命令面板行为统一。

---

### **M6：质量与扩展**
- 完善 E2E。
- 完善性能压测。
- 加入日志和诊断面板。
- 加入 crash recovery。
- 加入插件预留接口。
- 加入配置导入导出。

交付物：
- 可发布的稳定桌面客户端。
- 后续可以扩展更多连接类型和工具面板。

---

## **最佳实践总结**

- 用 `entities` 承载核心模型。
- 用 `features` 承载用户动作。
- 用 `widgets` 承载复杂业务 UI。
- 用 `shell` 承载工作台布局。
- 用 `shared` 承载无业务基础设施。
- 所有 IPC 只通过 repository。
- 所有命令只注册一次，由菜单、快捷键、命令面板复用。
- 所有复杂副作用都有 disposable。
- 所有持久化数据都有版本和 migration。
- 所有高频数据避免进入 Vue 深响应式。
- 所有大型树/列表默认考虑虚拟化。
- 所有领域逻辑优先写成纯函数，便于测试。

这个方案的核心思想是：**把 VRShell 当作一个小型 IDE/工作台来设计，而不是当作几个 Vue 组件拼起来的页面来设计。**
