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
│  │  │   Pages           │  │    │  │   commands.rs         │  │ │
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
│  │  │  settings          │  │    │  │  ssh_config_store     │  │ │
│  │  └────────┬──────────┘  │    │  └───────────────────────┘  │ │
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

后端采用经典的**分层架构**，从上到下为：Commands → Services → Domain → Infrastructure。

### 4.1 模块职责

#### 4.1.1 `commands.rs` — IPC 命令入口

注册所有 Tauri invoke handler，作为前端调用的唯一入口。负责参数解析、DTO 转换和错误类型映射。

注册的命令共 **28 个**，分为以下功能组：

| 功能组 | 命令 |
|--------|------|
| 会话树管理 | `load_session_tree`, `save_session_tree`, `session_tree_action`, `apply_session_tree_action` |
| SSH 终端 | `connect_ssh`, `send_input`, `disconnect_session`, `resize_pty`, `poll_events` |
| SFTP 文件 | `sftp_list`, `sftp_mkdir`, `sftp_create_file`, `sftp_rename`, `sftp_delete`, `sftp_upload`, `sftp_upload_directory`, `sftp_download`, `sftp_read_file` |
| SFTP 任务 | `list_sftp_tasks`, `cancel_sftp_task` |
| 凭据管理 | `keyring_store`, `keyring_get`, `keyring_delete` |
| SSH Config | `parse_ssh_config` |
| 诊断 | `test_ssh_connection`, `tcp_latency` |
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
| `terminal_service` | SSH 连接建立、认证（password/key/agent）、PTY 分配、非阻塞 I/O 读写、输出事件推送 |
| `sftp_service` | SFTP 会话建立、文件列表/读写/上传/下载、目录递归上传、进度事件推送、任务生命周期管理 |
| `session_service` | 会话树加载/保存/CRUD 操作、SSH Config 导入 |
| `credential_service` | 凭据存储/读取/删除，参数校验 |

#### 4.1.4 `infrastructure/` — 基础设施层

封装外部依赖的具体实现：

| 组件 | 职责 |
|------|------|
| `file_store` | JSON 文件持久化（会话树 `session-tree.v1.json`、SFTP 任务 `sftp-tasks.v1.json`），支持版本迁移 |
| `keyring_store` | 操作系统 Keyring 封装（基于 `keyring` crate），安全存储密码/密钥 |
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
| `security-hostKeyRequested` | — | SSH 主机密钥验证 |
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
  // ... 共 28 个命令
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

### 8.4 窗口安全

- 无原生窗口装饰（`decorations: false`），使用自定义 Titlebar
- 安全能力通过 Tauri Capabilities 声明（`dialog.json`、`events.json`）

---

## 9. IPC 契约

### 9.1 命令契约

前后端通过 `ipcContract.ts` / `contract.rs` 维护统一的命令列表，并在测试中验证一致性。

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
  │    typedInvoke() ──── Tauri IPC ────► commands.rs
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

## 13. 设计亮点

1. **类型安全的 IPC 契约**：前后端共享类型定义，编译期保证命令参数一致性
2. **分层解耦**：Domain 不依赖外部 crate，Services 编排业务，Infrastructure 封装 I/O
3. **非阻塞终端 I/O**：SSH Channel 非阻塞模式 + 重试策略，保证终端响应性
4. **SFTP 任务系统**：支持进度追踪、取消、持久化、自动清理
5. **贡献式架构**：面板、命令、设置项通过注册机制扩展，松耦合
6. **状态版本迁移**：前端 5 版本平滑迁移，带备份保护
7. **安全默认**：凭据走 OS Keyring、错误信息自动脱敏、密码不落盘
8. **响应式布局**：窗口 < 1100px 自动切换紧凑模式，侧边栏支持拖拽调整宽度
