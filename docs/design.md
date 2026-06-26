# VRShell 整体设计文档

## 1. 项目概述

VRShell 是一款基于 **Tauri 2.x** 框架的跨平台 SSH 终端与 SFTP 文件管理桌面应用。前端使用 **Vue 3 + TypeScript + Vite**，后端使用 **Rust**，通过 Tauri IPC 桥接前后端，实现 SSH 远程连接、终端交互、SFTP 文件传输和会话管理等功能。

### 1.1 核心能力

| 能力 | 说明 |
|------|------|
| SSH 终端 | 支持密码、密钥、SSH Agent 三种认证方式的远程终端连接 |
| SFTP 文件管理 | 远程文件浏览、上传/下载（含目录）、新建、重命名、删除 |
| 会话树管理 | 树形结构组织 SSH 会话分组与主机，支持 CRUD 与拖拽移动 |
| SSH Config 导入 | 解析本地 `~/.ssh/config` 文件并导入主机配置 |
| Host Key 校验 | 基于 `known_hosts` 校验服务器指纹，未知主机进入用户确认流程 |
| 凭据安全存储 | 使用操作系统 Keyring 安全存储密码/密钥短语 |
| 工作台 UI | VS Code 风格的多面板布局（侧边栏、底部 Dock、右侧详情面板） |
| 命令面板 | 全局命令搜索与快捷键绑定 |
| 主题切换 | 支持 Dark / Light 主题 |
| 状态持久化 | 前端 localStorage + 后端 JSON 文件双层持久化 |

---

## 2. 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri | 2.11 |
| 前端框架 | Vue 3 | 3.3+ |
| 构建工具 | Vite | 8.x |
| 类型检查 | TypeScript + vue-tsc | 5.9+ |
| 终端模拟 | xterm.js | 5.5 |
| 代码编辑 | CodeMirror 6 | 6.x |
| 布局分割 | splitpanes | 4.x |
| 图标 | Lucide Vue | 1.x |
| 代码规范 | Biome | 1.9+ |
| E2E 测试 | Playwright | 1.x |
| 单元测试 | Vitest | 4.x |
| SSH 协议 | ssh2 (Rust crate) | 0.9 |
| 凭据管理 | keyring (Rust crate) | 1.0 |
| 序列化 | serde + serde_json | 1.0 |

---

## 3. 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tauri 桌面应用                             │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐ │
│  │     Frontend (Vue 3)    │    │    Backend (Rust/Tauri)     │ │
│  │                         │    │                             │ │
│  │  ┌───────────────────┐  │    │  ┌───────────────────────┐  │ │
│  │  │   Pages           │  │    │  │   commands/           │  │ │
│  │  │   WorkbenchPage   │  │    │  │   (IPC Handler)       │  │ │
│  │  │   SettingsPage    │  │    │  └──────────┬────────────┘  │ │
│  │  └────────┬──────────┘  │    │             │               │ │
│  │           │             │    │  ┌──────────▼────────────┐  │ │
│  │  ┌────────▼──────────┐  │    │  │   Services Layer      │  │ │
│  │  │   Shell Layer     │  │    │  │  ┌─────────────────┐  │  │ │
│  │  │  Titlebar/Sidebar │  │    │  │  │ terminal_service│  │  │ │
│  │  │  ActivityBar/Dock │  │    │  │  │ sftp_service    │  │  │ │
│  │  │  StatusBar        │  │    │  │  │ session_service │  │  │ │
│  │  └────────┬──────────┘  │    │  │  │ credential_svc  │  │  │ │
│  │           │             │    │  │  └─────────────────┘  │  │ │
│  │  ┌────────▼──────────┐  │    │  └──────────┬────────────┘  │ │
│  │  │   Widgets         │  │    │             │               │ │
│  │  │  SessionWorkbench │  │    │  ┌──────────▼────────────┐  │ │
│  │  │  EditorWorkbench  │  │    │  │   Domain Layer        │  │ │
│  │  │  SessionExplorer  │  │    │  │  session / terminal   │  │ │
│  │  │  SftpExplorer     │  │    │  │  sftp / credential    │  │ │
│  │  │  TaskCenter ...   │  │    │  │  session_tree / ssh   │  │ │
│  │  └────────┬──────────┘  │    │  └──────────┬────────────┘  │ │
│  │           │             │    │             │               │ │
│  │  ┌────────▼──────────┐  │    │  ┌──────────▼────────────┐  │ │
│  │  │   Features        │  │    │  │   Infrastructure      │  │ │
│  │  │  session/terminal  │  │    │  │  file_store (JSON)    │  │ │
│  │  │  sftp/workspace    │  │    │  │  keyring_store (OS)   │  │ │
│  │  │  settings          │  │    │  │  ssh/known_hosts      │  │ │
│  │  └────────┬──────────┘  │    │  │  event_bus/config     │  │ │
│  │           │             │    │  └───────────────────────┘  │ │
│  │           │             │    │                             │ │
│  │  ┌────────▼──────────┐  │    │                             │ │
│  │  │   Entities        │  │    │                             │ │
│  │  │  session/terminal  │  │    │                             │ │
│  │  │  sftp/workspace    │  │    │                             │ │
│  │  │  task/security     │  │    │                             │ │
│  │  └────────┬──────────┘  │    │                             │ │
│  │           │             │    │                             │ │
│  │  ┌────────▼──────────┐  │    │                             │ │
│  │  │   Shared / IPC    │  │    │                             │ │
│  │  │  ipcClient        │◄─┼────┤  Tauri IPC (invoke/event)  │ │
│  │  │  ipcContract      │  │    │                             │ │
│  │  │  command / dialog  │  │    │                             │ │
│  │  └───────────────────┘  │    │                             │ │
│  └─────────────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 后端架构 (Rust)

后端采用经典的**分层架构**，从上到下为：Commands → Services → Domain → Infrastructure，并通过 `ipc/` 模块集中维护命令契约、DTO 与事件名称。

### 4.1 模块职责

#### 4.1.1 `commands/` — IPC 命令入口

按业务域拆分 Tauri invoke handler（`session`、`terminal`、`sftp`、`credential`、`security`、`devtools`），由 `commands/mod.rs` 聚合注册。命令层作为前端调用入口，负责参数解析、DTO 转换和错误类型映射，具体业务委托给 services 层。

当前注册的命令共 **29 个**，分为以下功能组：

| 功能组 | 命令 |
|--------|------|
| 会话树管理 | `load_session_tree`, `save_session_tree`, `session_tree_action`, `apply_session_tree_action` |
| SSH 终端 | `connect_ssh`, `send_input`, `disconnect_session`, `resize_pty`, `poll_events` |
| SFTP 文件 | `sftp_list`, `sftp_mkdir`, `sftp_create_file`, `sftp_rename`, `sftp_delete`, `sftp_upload`, `sftp_upload_directory`, `sftp_download`, `sftp_read_file` |
| SFTP 任务 | `list_sftp_tasks`, `cancel_sftp_task` |
| 凭据管理 | `keyring_store`, `keyring_get`, `keyring_delete` |
| SSH Config | `parse_ssh_config` |
| 诊断 | `test_ssh_connection`, `tcp_latency` |
| Host Key 安全 | `accept_host_key`, `reject_host_key` |
| 开发 | `open_devtools` |

#### 4.1.2 `domain/` — 领域模型

纯数据结构与业务规则，不依赖任何外部 crate：

| 模块 | 核心类型 | 职责 |
|------|----------|------|
| `session.rs` | `SessionGroup`, `SessionHost` | 会话树分组与主机定义 |
| `session_tree.rs` | `SessionTreeAction`, `SessionTreeTarget` | 会话树 CRUD 操作逻辑（create/edit/delete/move） |
| `terminal.rs` | `ConnectTerminalRequest`, `TerminalSession`, `TerminalOutputEvent` | 终端连接请求、会话状态、输出事件 |
| `sftp.rs` | `SftpConnectionRequest`, `SftpEntry`, `SftpTaskSnapshot` | SFTP 连接、文件条目、传输任务快照 |
| `credential.rs` | `CredentialRef` | 凭据引用（service + key） |
| `ssh_config.rs` | `SshConfigHost`, `parse_ssh_config()` | SSH Config 文件解析（支持 Host/HostName/User/Port/IdentityFile） |

#### 4.1.3 `services/` — 业务服务层

编排领域对象与基础设施，实现完整业务流程：

| 服务 | 职责 |
|------|------|
| `terminal_service` | SSH 连接建立、Host Key 验证、认证（password/key/agent）、PTY 分配、非阻塞 I/O 读写、输出事件推送 |
| `sftp_service` | SFTP 会话建立、文件列表/读写/上传/下载、目录递归上传、进度事件推送、任务生命周期管理 |
| `session_service` | 会话树加载/保存/CRUD 操作、SSH Config 导入 |
| `credential_service` | 凭据存储/读取/删除，参数校验 |

#### 4.1.4 `infrastructure/` — 基础设施层

封装外部依赖的具体实现：

| 组件 | 职责 |
|------|------|
| `file_store` | JSON 文件持久化（会话树 `session-tree.v1.json`、SFTP 任务 `sftp-tasks.v1.json`），支持版本迁移 |
| `keyring_store` | 操作系统 Keyring 封装（基于 `keyring` crate），安全存储密码/密钥 |
| `known_hosts_store` | 读写 `~/.ssh/known_hosts`，校验 SSH Host Key fingerprint，处理未知/变更主机 |
| `ssh_auth` | 封装 password/key/agent 认证策略与凭据解析 |
| `ssh_client` | 封装 TCP/SSH 会话建立细节，降低 services 对底层协议的耦合 |
| `event_bus` | `EventSink` 抽象，隔离 services 与 `tauri::WebviewWindow` 直接依赖 |
| `ssh_config_store` | 从 `~/.ssh/config` 或 `%USERPROFILE%\.ssh\config` 读取并解析 SSH 配置 |

### 4.2 状态管理

`BackendState` 是后端的全局共享状态，通过 `tauri::Manager::manage()` 注入：

```rust
pub(crate) struct BackendState {
    pub app_data_dir: PathBuf,                              // 应用数据目录
    pub terminals: Mutex<HashMap<String, TerminalSession>>,  // 终端会话元数据
    pub terminal_runtimes: Mutex<HashMap<String, TerminalRuntime>>, // SSH Session + Channel
    pub terminal_events: Mutex<HashMap<String, Vec<TerminalOutputEvent>>>, // 输出事件缓冲
    pub cancelled_sftp_tasks: Mutex<HashSet<String>>,       // 已取消的 SFTP 任务 ID
    pub sftp_tasks: Mutex<HashMap<String, SftpTaskSnapshot>>, // SFTP 任务快照
    pub pending_host_key_sessions: Mutex<HashMap<String, PendingHostKeySession>>, // 待确认 Host Key 的 SSH 会话
}
```

### 4.3 IPC 事件系统

后端通过 Tauri Event Emitter 向前端推送实时事件：

| 事件名 | 载荷 | 触发场景 |
|--------|------|----------|
| `terminal-output` | `{sessionId, dataBase64}` | SSH 终端输出数据 |
| `terminal-closed` | `{sessionId}` | 远程 Shell 关闭 |
| `terminal-error` | `{sessionId, error}` | 终端错误 |
| `sftp-progress` | `{taskId, transferredBytes, totalBytes, ...}` | SFTP 传输进度更新 |
| `sftp-completed` | `{taskId, ...}` | SFTP 传输完成 |
| `sftp-failed` | `{taskId, error, ...}` | SFTP 传输失败 |
| `security-hostKeyRequested` | `{pendingId, host, port, fingerprint, keyType}` | 未知 SSH Host Key，需要用户确认 |
| `interaction-promptRequested` | — | 用户交互提示 |

### 4.4 错误处理

`BackendError` 统一错误模型，序列化为 camelCase JSON：

```json
{ "code": "validationError", "message": "host is required", "recoverable": true }
```

错误类型：
- `notImplemented` — 功能未实现
- `validationError` — 参数校验失败
- `storageError` — 文件存储错误
- `credentialError` — 凭据相关错误

安全措施：错误消息中的 `password=`、`token=`、`secret=` 等敏感信息会被自动脱敏为 `[redacted]`。

---

## 5. 前端架构 (Vue 3)

前端采用**分层 + 功能模块化**的组织方式，借鉴了 VS Code 的贡献式架构。

### 5.1 目录分层

```
src/
├── app/              # 应用入口与生命周期
│   ├── lifecycle/    # bootstrap、persistence、shutdown
│   ├── providers/    # 全局 Provider（Theme/Shortcut/IPC/Persistence/ErrorBoundary）
│   ├── contributions/# 注册默认面板、命令、设置项
│   └── App.vue
├── pages/            # 页面组件（Workbench / Settings / Welcome）
├── shell/            # 工作台外壳（Titlebar / ActivityBar / Sidebar / Dock / StatusBar）
├── widgets/          # 独立功能面板（SessionWorkbench / EditorWorkbench / SftpExplorer 等）
├── features/         # 业务功能模块（session / terminal / sftp / workspace / settings）
├── entities/         # 核心实体（状态存储 + API 仓库 + 类型定义）
└── shared/           # 公共工具（IPC 客户端 / 命令系统 / 对话框 / 主题 / UI 组件）
```

### 5.2 应用生命周期

```
bootstrapApp()
  ├── applyInitialTheme()      // 应用初始主题
  ├── restoreAppState()        // 从 localStorage 恢复状态（含版本迁移）
  └── registerGlobalEffects()  // 注册默认面板、命令、状态栏项、响应式布局

createApp(App).mount('#app')
  └── AppProviders
       ├── ThemeProvider         // 主题管理
       ├── ShortcutProvider      // 全局快捷键
       ├── IpcEventProvider      // IPC 事件监听
       ├── PersistenceProvider   // 状态自动持久化
       ├── WorkbenchFeedbackProvider // Toast/通知
       └── ErrorBoundaryProvider // 错误边界
```

### 5.3 状态管理 (Entities)

采用**响应式 Store** 模式，每个实体模块导出单例 `state` 对象：

| 实体模块 | 状态 | 职责 |
|----------|------|------|
| `session` | `sessionState` | 会话列表、分组树、活跃会话 ID |
| `terminal` | `terminalState` | 终端标签页、活跃终端、输入队列、缓冲区注册 |
| `workspace` | `workspaceState` | 布局状态、面板可见性、主题、侧边栏宽度等 |
| `sftp` | `sftpState` | SFTP 连接、当前路径、文件列表 |
| `task` | `taskState` | 后台任务列表（SFTP 传输进度等） |
| `editor` | `editorState` | 代码编辑器状态 |
| `security` | `securityState` | 主机密钥验证、安全交互 |

每个实体模块的结构：

```
entities/<name>/
├── index.ts           # 公开导出
├── api/
│   └── <name>Repository.ts  # IPC 调用封装
└── model/
    ├── <name>.store.ts      # 响应式状态
    ├── <name>.types.ts      # 类型定义
    └── __tests__/           # 单元测试
```

### 5.4 IPC 通信层

#### 5.4.1 类型安全契约

`ipcContract.ts` 定义了前后端共享的 IPC 命令映射表 `IpcCommandMap`，确保每个命令的参数和返回值类型一致：

```typescript
export type IpcCommandMap = {
  connect_ssh: { args: ConnectSshArgs; result: string }
  sftp_list: { args: { connection: SftpConnection; path: string }; result: SftpEntry[] }
  // ... 共 29 个命令
}
```

#### 5.4.2 客户端封装

`ipcClient.ts` 提供 `typedInvoke()` 方法，具备以下能力：
- **类型安全调用**：根据命令名自动推导参数/返回值类型
- **运行时检测**：自动判断是否处于 Tauri 环境
- **Mock 支持**：测试/开发模式下使用内置 Mock 实现
- **错误标准化**：统一转换后端错误为前端 `IpcError`

### 5.5 Shell 外壳组件

`WorkbenchShell.vue` 是应用的主框架，提供以下区域：

```
┌──────────────────────────────────────────────────┐
│                   AppTitlebar                     │
├─────┬──────────────────────────────┬─────────────┤
│     │                              │             │
│ A   │         Main Area            │   Right     │
│ c   │  ┌──────────────────────┐    │   Sider     │
│ t   │  │  SessionWorkbench /  │    │  (Detail    │
│ i   │  │  EditorWorkbench     │    │   Panels)   │
│ v   │  ├──────────────────────┤    │             │
│ i   │  │   Dock Panel         │    │             │
│ t   │  │  (Logs/Problems/     │    │             │
│ y   │  │   Output/Tasks)      │    │             │
│ B   │  └──────────────────────┘    │             │
│ a   │                              │             │
│ r   │                              │             │
├─────┴──────────────────────────────┴─────────────┤
│                   StatusBar                       │
├──────────────────────────────────────────────────┤
│  Overlays: CommandPalette / QuickOpen / Settings  │
│            ContextMenu / Dialog / Toast           │
└──────────────────────────────────────────────────┘
```

### 5.6 贡献式注册

通过 `WorkspaceContribution` 接口实现可扩展的注册机制：

```typescript
interface WorkspaceContribution {
  commands?: AppCommand[]           // 命令注册
  dockPanels?: DockPanelRegistration[]    // 底部 Dock 面板
  sidebarPanels?: SidebarPanelRegistration[] // 侧边栏面板
  settingsSections?: SettingsSectionRegistration[] // 设置分区
  statusItems?: StatusBarItemFactory[]  // 状态栏项
}
```

### 5.7 状态持久化

前端状态持久化使用 localStorage，支持 **5 个版本的平滑迁移**：

| 版本 | 变更 |
|------|------|
| V1 | 初始版本（sessions + groups + activePanel） |
| V2 | 结构微调 |
| V3 | 引入 `workspaceLayout` 替代 `activePanel` |
| V4 | 布局字段扩展 |
| V5（当前） | 完整布局快照 + 主题持久化 |

持久化数据会**脱敏处理**：密码和密钥短语在存储前被置为 `null`。

---

## 6. SSH 终端子系统

### 6.1 连接流程

```
前端 invoke('connect_ssh', args)
  │
  ▼
commands::connect_ssh()
  ├── 构造 ConnectTerminalRequest
  ├── terminal_service::connect()
  │   ├── validate_terminal_request()
  │   ├── open_ssh_shell()
  │   │   ├── TCP 连接（12s 超时）
  │   │   ├── SSH Handshake
  │   │   ├── 认证（password / key / agent）
  │   │   ├── 请求 PTY (xterm-256color, 80x24)
  │   │   └── 启动远程 Shell
  │   └── 注册 TerminalSession + TerminalRuntime 到 BackendState
  └── terminal_service::start_output_reader()
      └── 后台线程循环读取输出 → emit('terminal-output') 事件
```

### 6.2 数据流

- **输入**：前端 → base64 编码 → `send_input` → 后端解码 → 非阻塞写入 SSH Channel
- **输出**：后台线程读取 SSH Channel → base64 编码 → Tauri Event → 前端 xterm.js 渲染
- **PTY 调整**：`resize_pty` → `channel.request_pty_size(cols, rows)`

### 6.3 非阻塞 I/O

SSH Session 设置为非阻塞模式，写入时采用重试策略：
- 遇到 `WouldBlock` 时，先读取挂起的输出数据
- 等待 10ms 后重试，最多 50 次

---

## 7. SFTP 文件传输子系统

### 7.1 操作类型

| 操作 | 说明 |
|------|------|
| `sftp_list` | 列出远程目录（目录优先，名称排序） |
| `sftp_mkdir` | 创建远程目录 (0755) |
| `sftp_create_file` | 创建远程文件 (0644) |
| `sftp_rename` | 重命名远程文件/目录 |
| `sftp_delete` | 删除远程文件/目录（自动判断类型） |
| `sftp_upload` | 上传文件（支持内存数据或本地路径） |
| `sftp_upload_directory` | 递归上传整个目录 |
| `sftp_download` | 下载文件（支持保存到本地路径或返回 base64） |
| `sftp_read_file` | 读取远程文件内容（返回 base64） |

### 7.2 传输任务管理

- 每个传输任务有唯一 `taskId`，状态为 `running → done/failed/cancelled`
- 传输过程中通过 `sftp-progress` 事件实时推送进度
- 支持任务取消：通过 `cancelled_sftp_tasks` 集合在每次写入块前检查
- 任务数据持久化到 `sftp-tasks.v1.json`，最多保留 100 条，已完成任务保留 7 天
- 传输缓冲区大小：64KB

---

## 8. 安全设计

### 8.1 凭据管理

- 使用操作系统原生 Keyring（Windows Credential Manager / macOS Keychain / Linux Secret Service）
- 凭据以 `service + key` 二元组定位，如 `vrshell / session:abc:password`
- 密码在持久化到 localStorage 前被 scrub（置为 null）

### 8.2 错误信息脱敏

后端 `scrub_sensitive_message()` 自动将错误消息中的 `password=xxx`、`token=xxx`、`secret=xxx` 替换为 `[redacted]`。

### 8.3 SSH 认证

支持三种认证方式，可按优先级自动推断：
1. **Agent**（默认）：使用系统 SSH Agent
2. **Password**：密码认证，支持从 Keyring 读取
3. **Key**：私钥文件认证，支持 passphrase

### 8.4 Host Key 校验

- `known_hosts_store` 负责读取 `~/.ssh/known_hosts`，按 `[host]:port` 与主机名匹配服务器指纹
- 已知且匹配时继续连接；已知但不匹配时返回不可恢复错误，避免潜在中间人攻击
- 未知主机时，后端暂存 `PendingHostKeySession` 并发出 `security-hostKeyRequested`，前端通过 `accept_host_key` / `reject_host_key` 完成用户确认
- 用户接受后写入 `known_hosts`，再继续认证与 PTY 初始化

### 8.5 窗口安全

- 无原生窗口装饰（`decorations: false`），使用自定义 Titlebar
- 安全能力通过 Tauri Capabilities 声明（`dialog.json`、`events.json`）

---

## 9. IPC 契约

### 9.1 命令契约

前后端通过 `ipcContract.ts` / `contract.rs` 维护统一的命令列表，并由 `scripts/generate-ipc-contract.mjs` 辅助生成前端命令常量，测试中验证一致性。

后端 `contract.rs` 测试确保：
- 命令名称唯一
- 与前端命令列表完全匹配

前端 `ipcContract.ts` 提供：
- `IpcCommandMap` 类型映射
- `ipcCommandNames` 常量数组（类型安全）

### 9.2 数据格式

所有 IPC 数据使用 **camelCase** JSON 序列化（通过 `#[serde(rename_all = "camelCase")]`）。

---

## 10. 构建与开发

### 10.1 项目结构

```
VRShell/
├── frontend/         # Vue 3 前端
├── src-tauri/        # Rust 后端
├── scripts/          # 工具脚本
├── package.json      # 根 npm 脚本入口
└── docs/             # 文档
```

### 10.2 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动前端开发服务器 |
| `npm run tauri:dev` | 启动 Tauri 开发模式（前后端同时） |
| `npm run tauri:build` | 构建生产版本 |
| `npm run check` | 全量检查（IPC 生成 → JSON → UTF8 → Lint → TypeCheck → Test → Rust Check → Rust Test → Clippy） |
| `npm run rust:clippy` | Rust 代码质量检查 |
| `npm run test:e2e` | E2E 测试（Playwright） |
| `npm run security:audit` | 安全审计（npm + cargo audit） |

### 10.3 Release 优化

```toml
[profile.release]
opt-level = 3      # 最高优化
lto = "fat"        # 全链接时优化
codegen-units = 1  # 单代码生成单元
strip = true       # 剥离调试符号
```

---

## 11. 前端功能模块一览

### 11.1 Widgets（工作台面板）

| Widget | 位置 | 功能 |
|--------|------|------|
| `SessionWorkbench` | 主区域 | 终端标签页 + xterm.js 终端 |
| `EditorWorkbench` | 主区域（可选） | CodeMirror 代码编辑器 |
| `SessionExplorer` | 侧边栏 | 会话树浏览、CRUD、拖拽 |
| `SftpExplorer` | 侧边栏 | 远程文件浏览与传输 |
| `TaskCenter` | 侧边栏 | 后台任务列表 |
| `SearchPanel` | 侧边栏 | 全局搜索 |
| `LogsPanel` | 底部 Dock | 应用日志 |
| `ProblemsPanel` | 底部 Dock | 警告/错误诊断 |
| `OutputPanel` | 底部 Dock | 输出通道 |
| `SessionDetail` | 右侧 Dock | 会话详情 |
| `SftpItemDetail` | 右侧 Dock | 文件详情 |
| `TaskDetail` | 右侧 Dock | 任务详情 |
| `TerminalInfo` | 右侧 Dock | 终端运行时信息 |

### 11.2 命令系统

通过 `createAppCommands()` 注册约 **25+ 个命令**，涵盖：

| 分组 | 示例命令 | 快捷键 |
|------|----------|--------|
| Workspace | 命令面板、QuickOpen、布局重置、面板切换 | Ctrl+P, Ctrl+K, Ctrl+O, Ctrl+Shift+M |
| Session | 快速创建 SSH 会话、导入 SSH Config | Ctrl+N |
| Terminal | 搜索、重连、广播命令 | Ctrl+F |
| SFTP | 打开 SFTP 面板 | — |
| Settings | 打开设置、切换主题 | Ctrl+, |

---

## 12. 数据流总览

```
用户操作
  │
  ▼
Vue 组件 (Widget/Feature)
  │
  ▼
Entity Store (响应式状态)
  │
  ├──► Repository (IPC 调用封装)
  │      │
  │      ▼
  │    typedInvoke() ──── Tauri IPC ────► commands/
  │                                           │
  │                                           ▼
  │                                       Service Layer
  │                                           │
  │                              ┌─────────────┼─────────────┐
  │                              ▼             ▼             ▼
  │                         Domain       Infrastructure   SSH/SFTP
  │                         (模型/规则)   (File/Keyring)  (ssh2 crate)
  │
  ├──► 本地持久化 (localStorage)
  │
  ▼
UI 更新 (响应式绑定)

实时事件流:
  SSH Channel ──► 后台线程 ──► Tauri Event ──► IpcEventProvider ──► Store 更新 ──► UI 更新
```

---

## 13. 当前设计方向与改进建议

### 13.1 当前设计方向

1. **分层边界继续收敛**：后端正在从单文件 `commands.rs` 过渡到按领域拆分的 `commands/` 模块，并通过 `ipc/contract.rs`、`ipc/dto.rs`、`ipc/events.rs` 固化边界。
2. **安全链路前移**：SSH 连接流程已将 Host Key 校验纳入核心路径，未知主机采用“暂停会话 → 用户确认 → 继续认证”的交互式安全模型。
3. **前端工作台平台化**：面板、命令、设置项和状态栏通过 contribution/registry 注册，业务功能逐步沉淀为可插拔工作台能力。
4. **状态持久化分层**：UI 布局与轻量会话状态保存在 localStorage，后端结构化数据与任务快照保存在 JSON 文件，敏感凭据仅保留引用。

### 13.2 改进建议与落地方案

#### 13.2.1 P0：契约一致性与类型收敛

| 问题 | 落地修改 | 验收标准 |
|------|----------|----------|
| `ipcContract.ts` 中重复定义 `SftpConnection`，当前依赖 TypeScript 接口声明合并 | 保留一个完整的 `SftpConnection` 定义，统一包含 `authMethod`、`credentialRef`、`password`、`privateKeyPath`、`passphrase` 字段；删除尾部重复接口 | `npm run typecheck` 通过，SFTP repository 与 SSH 连接参数不再出现类型歧义 |
| 前后端命令列表依赖人工同步，存在契约漂移风险 | 将 `scripts/generate-ipc-contract.mjs` 作为固定检查入口，在 `npm run check` 中先生成 `frontend/src/shared/ipc/generated/backendCommands.ts`，再由前端/后端测试对比命令列表 | 修改 `src-tauri/src/ipc/contract.rs` 后，如果未同步前端契约，测试应失败 |
| `ipcContract.ts` 同时承担类型定义、命令列表、事件类型职责 | 中期拆分为 `ipcCommands.ts`、`ipcTypes.ts`、`ipcEvents.ts`，`ipcContract.ts` 仅作为兼容导出入口 | 新增 IPC 命令时只需要改后端 contract 与对应类型，不需要手工维护多份命令名 |

#### 13.2.2 P1：安全关键路径测试

Host Key 是 SSH 安全链路的关键路径，应补充三类测试：

| 场景 | 覆盖点 | 建议测试层级 |
|------|--------|--------------|
| 未知 Host Key | 后端创建 `PendingHostKeySession`，前端收到 `security-hostKeyRequested` 并展示确认交互 | Rust 单元测试 + 前端 store 测试 |
| 用户接受 Host Key | `accept_host_key` 写入 `known_hosts`，继续认证并返回终端 session id | Rust service 测试 |
| Host Key 变更 | 已有 host 的 fingerprint 不一致时拒绝连接，并给出不可恢复错误 | Rust 单元测试 + E2E smoke |

验收目标：Host Key accept/reject/changed key 任一路径回归时，`npm run check` 或安全专项测试能稳定失败。

#### 13.2.3 P1：后端职责边界收敛

建议将后端职责边界固化为以下约定：

| 层级 | 应做 | 不应做 |
|------|------|--------|
| `commands/` | 接收 Tauri invoke、调用 DTO 转换、委托 service、映射错误 | 直接读写文件、直接操作 `ssh2::Session`、堆叠业务规则 |
| `ipc/dto.rs` | 前后端字段映射、camelCase DTO、领域模型转换 | 执行业务校验、访问 `BackendState` |
| `services/` | 编排业务流程、管理运行时状态、调用基础设施 | 直接暴露 Tauri 类型给 domain |
| `infrastructure/` | 封装文件、Keyring、SSH、EventSink 等外部依赖 | 保存 UI 状态或处理前端交互细节 |
| `domain/` | 保存纯模型、枚举、校验规则和无副作用逻辑 | 依赖 Tauri、ssh2、文件系统或 Keyring |

短期可优先检查 `terminal_service` 与 `sftp_service`：把重复参数转换下沉到 `ipc/dto.rs`，把底层 SSH 会话建立细节继续收敛到 `ssh_client` / `ssh_auth`。

#### 13.2.4 P1：后台任务模型统一

当前 SFTP 任务已经具备 `taskId`、状态、进度、取消和持久化能力，可抽象为通用后台任务模型：

```typescript
type BackgroundTaskKind = 'sftp-upload' | 'sftp-download' | 'search' | 'archive' | 'command'

type BackgroundTaskStatus = 'running' | 'done' | 'failed' | 'cancelled'
```

落地路径：
1. 保留现有 `SftpTaskSnapshot` 作为兼容 DTO，新增通用 `BackgroundTaskSnapshot`。
2. `TaskCenter` 改为消费通用任务模型，SFTP 仅作为一种任务来源。
3. 后端将任务取消集合从 `cancelled_sftp_tasks` 逐步迁移为通用 `cancelled_tasks`。
4. 事件命名从 `sftp-progress` 长期演进为 `task-progress`，当前版本保留 SFTP 事件做兼容桥接。

#### 13.2.5 P2：兼容性与可观测性增强

| 方向 | 建议 |
|------|------|
| OpenSSH 兼容 | `known_hosts_store` 增加 hashed known_hosts、主机别名、同 host 多 key 类型并存、非 22 端口格式兼容 |
| 日志链路 | 将 Rust `tracing` 输出桥接到前端 `OutputPanel` / `LogsPanel`，按连接、认证、SFTP、IPC 划分 channel |
| 状态管理路线 | 明确继续使用响应式单例 store，或逐步迁移到 Pinia；在确定路线前避免新增双写状态源 |
| 错误诊断 | 为 `BackendError` 增加可选 `details` / `suggestion` 字段，前端用于展示可恢复操作建议 |

#### 13.2.6 建议实施顺序

1. **先做 P0 类型与契约治理**：修复重复接口、强化生成契约校验，成本低且收益直接。
2. **再补安全测试**：Host Key 属于安全关键路径，应先有回归保护再继续扩展兼容逻辑。
3. **随后收敛后端职责边界**：减少命令层与 service 层的重复转换，让后续功能更容易扩展。
4. **最后推进任务模型与日志链路**：这两项会影响多个 UI 面板和后端事件，适合在契约稳定后实施。

### 13.3 阶段路线图

| 阶段 | 目标 | 主要改动 | 退出标准 |
|------|------|----------|----------|
| M1：契约治理 | IPC 命令、类型、事件可稳定演进 | 修复重复类型、强化 `generate:ipc`、补充契约测试 | `npm run check` 可发现命令漂移与类型错误 |
| M2：安全闭环 | Host Key 与凭据链路具备回归保护 | 增加 Host Key 单元测试、前端交互测试、安全错误提示 | accept/reject/changed key 路径均有自动化覆盖 |
| M3：后端边界收敛 | commands/service/infrastructure 职责清晰 | DTO 转换下沉、SSH 建连收敛、事件发射通过 `EventSink` | 新增命令时无需跨层复制业务逻辑 |
| M4：任务中心平台化 | SFTP 任务演进为通用后台任务 | 引入 `BackgroundTaskSnapshot`、通用取消集合、任务事件桥接 | `TaskCenter` 可展示非 SFTP 类型任务 |
| M5：可观测性增强 | 连接、认证、传输问题可快速定位 | 后端 `tracing` 接入前端日志/输出通道、错误建议字段 | 用户可从 UI 看到关键失败原因和恢复建议 |

### 13.4 变更验收清单

每次涉及架构边界、IPC 或安全链路的改动，建议按以下清单验收：

| 类别 | 检查项 |
|------|--------|
| IPC 契约 | `src-tauri/src/ipc/contract.rs`、`frontend/src/shared/ipc/ipcContract.ts`、`generated/backendCommands.ts` 三者一致 |
| 类型安全 | 前端 `typedInvoke()` 调用能正确推导参数和返回值，不出现重复接口声明合并依赖 |
| 错误模型 | 后端错误返回保持 camelCase，敏感信息经过 `scrub_sensitive_message()` 脱敏 |
| 安全链路 | 密码、passphrase 不写入 localStorage；Host Key 变更不允许静默继续连接 |
| 状态迁移 | localStorage schema 变更需要递增版本，并保留 migration backup |
| 任务持久化 | 后台任务状态变更需要同步内存快照、事件推送和 JSON 持久化策略 |
| UI 回归 | 工作台布局、命令面板、侧边栏、右侧详情、底部 Dock 在紧凑模式下可用 |

### 13.5 风险与约束

| 风险 | 影响 | 缓解方式 |
|------|------|----------|
| IPC 契约自动生成不完整 | 前后端类型仍可能漂移 | 生成命令名之外，逐步补充 DTO schema 或类型快照测试 |
| Host Key 兼容 OpenSSH 细节不足 | 部分用户已有 `known_hosts` 无法正确匹配 | 分阶段支持 hashed host、多 key 类型、别名与端口格式 |
| 通用任务模型过早抽象 | SFTP 当前稳定能力被重构影响 | 先做兼容 DTO 与桥接事件，避免一次性替换所有 SFTP 事件 |
| 日志桥接产生敏感信息 | 密码、token、路径等可能出现在 UI 日志 | 后端输出前统一脱敏，前端日志面板限制复制和导出范围 |
| 状态管理路线不统一 | 响应式单例 store 与 Pinia 并存导致调试困难 | 在设计上明确单一主线，迁移期间只允许单向适配层 |

### 13.6 专项改进建议

#### 13.6.1 前端架构与体验

| 方向 | 建议 | 收益 |
|------|------|------|
| Store 边界 | 为 `entities/*/model` 增加统一命名约定：`state`、`actions`、`selectors`、`persistence` 分离 | 降低 store 膨胀，提升可测试性 |
| 命令系统 | 为 `AppCommand` 增加 `category`、`when`、`enablement`、`telemetryKey` 字段 | 支持上下文命令、禁用态提示和使用分析 |
| 快捷键 | 引入快捷键冲突检测和用户自定义 keymap | 避免默认快捷键覆盖浏览器/Tauri 系统行为 |
| 面板注册 | 为 sidebar/dock/right panel 注册项增加 lazy loader | 减少首屏 bundle 与初始化成本 |
| 空状态体验 | 为 Session、SFTP、Task、Logs 等面板统一 Empty State 组件 | 降低新用户理解成本 |
| 可访问性 | 为命令面板、树、菜单、对话框补充键盘导航与 ARIA 属性 | 提升键盘用户和辅助技术可用性 |

#### 13.6.2 后端稳定性与资源管理

| 方向 | 建议 | 收益 |
|------|------|------|
| Runtime 生命周期 | 为 `TerminalRuntime` 增加显式状态机：`connecting`、`verifyingHostKey`、`authenticating`、`ready`、`closing`、`closed` | 避免连接过程中的竞态和重复关闭 |
| 会话清理 | 为断开的 terminal runtime、pending host key session、SFTP task 增加 TTL 清理策略 | 防止长时间运行后的内存增长 |
| 并发控制 | 为 SFTP 上传/下载增加全局与单主机并发上限 | 避免大量任务压垮远端主机或本地线程 |
| 取消语义 | 将取消标记从 HashSet 扩展为可订阅 cancellation token | 让长耗时读写、目录递归、未来搜索任务共享取消机制 |
| 文件写入 | JSON 持久化采用 temp file + atomic rename | 降低异常退出导致状态文件损坏的概率 |
| 错误分级 | 将 `BackendError` 分为用户可恢复、需要重试、需要配置修复、内部错误 | 方便前端给出更准确的操作建议 |

#### 13.6.3 SSH / SFTP 能力增强

| 能力 | 建议 | 优先级 |
|------|------|--------|
| SSH KeepAlive | 增加 keepalive interval 与超时配置，并暴露到会话设置 | P1 |
| 自动重连 | 基于 `autoReconnect` 与 `idleTimeoutSecs` 完善断线重连策略和 UI 提示 | P1 |
| 代理跳转 | 支持 ProxyJump / ProxyCommand 的配置解析与连接链路 | P2 |
| 端口转发 | 规划 local/remote/dynamic forwarding 的模型和 UI 入口 | P2 |
| SFTP 断点续传 | 对下载/上传实现 resume 校验，包含远端大小、mtime、hash 策略 | P1 |
| 文件冲突策略 | 上传/下载支持 overwrite、skip、rename、compare 四类策略 | P1 |
| 远程编辑 | SFTP 文件读取后进入 EditorWorkbench，保存时走临时文件 + 原子上传 | P2 |

#### 13.6.4 测试体系补强

| 层级 | 建议覆盖 | 触发命令 |
|------|----------|----------|
| Rust 单元测试 | `known_hosts_store`、`ssh_config_store`、DTO 转换、错误脱敏、FileStore 迁移 | `npm run rust:test` |
| 前端单元测试 | store actions、layout migration、command registry、ipc facade、security prompt state | `npm run test:frontend` |
| 契约测试 | 后端 `COMMANDS`、前端 `ipcCommandNames`、生成文件一致性 | `npm run generate:ipc && npm run test:frontend && npm run rust:test` |
| E2E smoke | 首屏加载、命令面板、创建会话表单、SFTP 面板、设置页、主题切换 | `npm run test:e2e:smoke` |
| 安全专项 | 凭据不落盘、错误脱敏、Host Key accept/reject/changed key | 可新增 `npm run test:security` |

#### 13.6.5 性能与可观测性

| 场景 | 改进建议 | 指标 |
|------|----------|------|
| 终端输出高频刷新 | 前端对 `terminal-output` 做批处理与 animation frame 合并 | 大量输出时 UI 不掉帧 |
| SFTP 大目录 | 目录列表支持分页、排序延迟执行和虚拟滚动 | 万级文件目录可操作 |
| 任务进度事件 | 后端限制进度事件频率，前端按 taskId 合并更新 | 降低 IPC 事件风暴 |
| 首屏加载 | 面板组件 lazy load，非活跃 widget 延迟初始化 | 缩短 Tauri 窗口可交互时间 |
| 日志诊断 | 每个连接生成 `traceId`，贯穿 SSH、SFTP、IPC、UI toast | 用户反馈可定位到具体链路 |

#### 13.6.6 安全与隐私

| 方向 | 建议 |
|------|------|
| 日志脱敏 | 脱敏规则从错误消息扩展到 tracing、OutputPanel、任务详情和导出日志 |
| 凭据引用 | 会话配置只保存 `credentialRef`，禁止保存明文 password/passphrase 的 schema 字段 |
| 最小权限 | Tauri capabilities 按窗口和功能收敛，避免插件权限一次性全开 |
| 本地文件访问 | SFTP 上传/下载前明确文件选择来源，避免任意路径静默读写 |
| 主机信任 | Host Key 变更必须强提示，并提供旧/新 fingerprint 对比，不允许默认接受 |

#### 13.6.7 发布与升级

| 方向 | 建议 |
|------|------|
| 配置迁移 | 为后端 JSON 文件增加 `schemaVersion` 和迁移函数，和前端 localStorage 迁移保持一致 |
| 备份恢复 | 关键状态文件写入前保留 `.bak`，启动时检测损坏并尝试恢复 |
| 版本兼容 | Release Note 明确 IPC、存储 schema、配置项变更，方便问题回滚 |
| 诊断包 | 增加“导出诊断信息”能力，只包含脱敏日志、版本、平台、配置摘要 |
| 自动更新 | 若未来接入 Tauri updater，需要设计签名校验、灰度和失败回滚策略 |

### 13.7 文档维护规则

- 新增 IPC 命令时，同步更新 **第 4.1.1 节命令分组**、**第 9 节 IPC 契约** 和相关数据流说明。
- 新增持久化字段时，同步更新 **第 5.7 节状态持久化** 或 **第 4.1.4 节基础设施层**。
- 新增安全能力时，同步更新 **第 8 节安全设计**，并注明是否影响凭据、Host Key、错误脱敏或 Tauri capabilities。
- 新增工作台面板或命令时，同步更新 **第 11 节前端功能模块一览** 和 contribution 注册说明。
- 每次架构调整后，优先用当前代码结构校验文档，不以历史设计为准。

---

## 14. 设计亮点

1. **类型安全的 IPC 契约**：前后端共享类型定义，编译期保证命令参数一致性
2. **分层解耦**：Domain 不依赖外部 crate，Services 编排业务，Infrastructure 封装 I/O
3. **非阻塞终端 I/O**：SSH Channel 非阻塞模式 + 重试策略，保证终端响应性
4. **SFTP 任务系统**：支持进度追踪、取消、持久化、自动清理
5. **贡献式架构**：面板、命令、设置项通过注册机制扩展，松耦合
6. **状态版本迁移**：前端 5 版本平滑迁移，带备份保护
7. **安全默认**：凭据走 OS Keyring、错误信息自动脱敏、密码不落盘，并校验 SSH Host Key
8. **响应式布局**：窗口 < 1100px 自动切换紧凑模式，侧边栏支持拖拽调整宽度
