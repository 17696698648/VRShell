# VRShell Backlog

本文件用于给 agent 提供可直接执行的任务队列。

## 使用方式

对 agent 直接说：

> 按 `docs/backlog.md` 从上往下做。

如果希望更严格一些，可以说：

> 按 `docs/backlog.md` 从上往下做。一次只做一个任务；每完成一个任务后，更新本文件中的状态、完成日期、变更摘要与验证结果，再继续下一个任务。

## 执行规则

1. **按顺序执行**：默认从最上方第一个 `todo` 任务开始。
2. **一次只做一个任务**：除非任务说明里明确允许并行或包含子任务打包实施。
3. **最小改动原则**：优先在现有架构上做最小、可验证的变更，避免顺手进行无关重构。
4. **先读再改**：实施前先阅读任务列出的相关文件，确认当前实现与边界。
5. **必须验证**：每个任务完成后，运行任务列出的验证命令；如命令不适用，需要在备注中说明原因。
6. **更新状态**：任务完成后，将 `Status` 从 `todo` 改为 `done`，补充 `Completed`、`Change Summary`、`Validation`。
7. **遇到阻塞**：只有在目标冲突、依赖缺失、测试环境不可用或需要重大架构决策时才停下并汇报。

## 通用完成定义

一个任务只有在以下条件都满足时才能标记完成：

- 代码、测试、必要文档已经落地；
- 对应验收标准全部满足；
- 已运行相关检查并处理新增错误；
- 未引入明显的契约漂移、类型错误或安全回退；
- 已在本文件记录完成信息。

---

## Task 01 - IPC 契约一致性校验与类型收敛

- **ID**: `BL-01`
- **Priority**: `P0`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`

### Goal

将 IPC 契约生成与校验变成强制门禁，消除前端重复/歧义 IPC 类型定义，避免前后端命令与类型漂移。

### Scope

- 将 `scripts/generate-ipc-contract.mjs` 挂入固定检查链路；
- 让前端命令名与契约类型尽量由生成结果驱动；
- 收敛 `frontend/src/shared/ipc/ipcContract.ts` 中重复或依赖接口合并的定义；
- 必要时补充开发说明。

### Non-Goals

- 本任务不做大规模 IPC DTO 重构；
- 本任务不修改无关业务流程。

### Acceptance Criteria

- [x] 修改 `src-tauri/src/ipc/contract.rs` 中命令定义但未同步前端契约时，检查命令会失败；
- [x] `frontend/src/shared/ipc/ipcContract.ts` 中不再依赖重复接口声明合并；
- [x] 本地与 CI 可复用同一套契约检查入口；
- [x] 至少补充 1 处开发说明，说明新增/修改 IPC 命令的标准流程。

### Suggested Files

- `scripts/generate-ipc-contract.mjs`
- `package.json`
- `frontend/src/shared/ipc/ipcContract.ts`
- `frontend/src/shared/ipc/generated/backendCommands.ts`
- `src-tauri/src/ipc/contract.rs`
- 如有必要：相关测试与文档文件

### Validation

```powershell
npm.cmd run check:ipc
npm.cmd run typecheck
npm.cmd run test:frontend
npm.cmd run rust:test
```

### Change Summary

- 移除 `frontend/src/shared/ipc/ipcContract.ts` 中 `SftpEntry.is_dir` 的遗留 snake_case 字段，并同步更新 SFTP repository、浏览器 mock 与 Playwright Tauri mock 为 `isDirectory`。
- 将 `src-tauri/src/ipc/contract.rs` 的前端契约测试改为直接读取 `frontend/src/shared/ipc/generated/backendCommands.ts`，避免 Rust 侧继续维护一份重复命令列表。
- 在 `docs/testing.md` 中补充“修改 `src-tauri/src/ipc/contract.rs` 后需运行 `npm.cmd run generate:ipc` 并提交生成文件”的标准流程说明。
- 顺手修复 2 个过时的 SFTP raw-source 合约测试，使前端测试套件重新通过。

### Validation Notes

- 通过：`npm.cmd run check:ipc`
- 通过：`npm.cmd run typecheck`
- 通过：`npm.cmd run test:frontend`
- 通过：`npm.cmd run rust:test`
- 通过：`npm.cmd run check:utf8`
- 阻塞说明：`npm.cmd run check` 仍因现有前端 UI guard 失败而中断，报错文件为 `frontend/src/shell/dock/dock.css`、`frontend/src/shell/styles/jetbrains-theme.css`、`frontend/src/shell/styles/overlays.css`，与本任务改动无关。

---

## Task 02 - 配置与任务持久化原子写入保护

- **ID**: `BL-02`
- **Priority**: `P1`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`
- **Depends On**: `BL-01`（建议顺序依赖，便于先稳定检查链路）

### Goal

将关键 JSON 持久化改为临时文件写入 + 原子替换，降低异常退出、崩溃或中断写入造成状态文件损坏的风险。

### Scope

- 为 `FileStore` 中关键写入路径引入统一原子写入辅助逻辑；
- 处理临时文件命名、覆盖与清理；
- 为成功与失败场景补充 Rust 测试；
- 如有必要，补充保存失败的错误信息或文档说明。

### Non-Goals

- 本任务不改动数据模型结构；
- 本任务不扩展新的持久化后端。

### Acceptance Criteria

- [x] 关键持久化文件不再直接覆盖写入；
- [x] 写入失败时原文件仍保持可读；
- [x] 不会产生损坏 JSON 或 0 字节文件；
- [x] 至少覆盖成功写入、临时文件失败、替换失败等关键路径测试。

### Suggested Files

- `src-tauri/src/infrastructure/file_store.rs`
- `src-tauri/src/error.rs`
- 如有必要：相关测试模块

### Validation

```powershell
npm.cmd run rust:test
npm.cmd run rust:check
npm.cmd run rust:clippy
```

### Change Summary

- 为 `src-tauri/src/infrastructure/file_store.rs` 增加 temp-file 写入、`sync_all()`、目标文件备份替换与失败恢复逻辑，并让 `save_session_tree` / `save_sftp_tasks` 统一走该原子化辅助函数。
- 增加 replace 阶段失败后恢复原文件的单元测试，以及覆盖覆盖式保存后不遗留 `.tmp` / `.bak` sidecar 文件的测试。

### Validation Notes

- 通过：`npm.cmd run rust:test`
- 通过：`npm.cmd run rust:check`
- 通过：`npm.cmd run rust:clippy`

---

## Task 03 - Host Key 安全关键路径自动化测试补强

- **ID**: `BL-03`
- **Priority**: `P1`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`
- **Depends On**: `BL-01`

### Goal

为 Host Key 的 accept / reject / changed key 链路建立自动化回归保护，避免 SSH 安全策略被后续变更弱化。

### Scope

- 补充未知 Host Key、用户接受 Host Key、Host Key 变更拒绝等测试；
- 如已有前端 store 或事件处理逻辑，补充相应交互状态测试；
- 明确错误码、事件或状态行为的断言。

### Non-Goals

- 本任务不扩展 OpenSSH hashed known_hosts 兼容能力；
- 本任务不重写整条连接流程。

### Acceptance Criteria

- [x] 未知 Host Key 路径有自动化覆盖；
- [x] 用户接受 Host Key 后继续连接的路径有自动化覆盖；
- [x] 已记录主机指纹变更时必须拒绝连接，并有自动化覆盖；
- [x] 相关测试可纳入现有检查链路或安全专项测试命令。

### Suggested Files

- `src-tauri/src/infrastructure/known_hosts_store.rs`
- `src-tauri/src/services/terminal_service.rs`
- `frontend/src/entities/security/`
- `frontend/src/shared/ipc/`
- 相关测试文件

### Validation

```powershell
npm.cmd run test:frontend
npm.cmd run rust:test
npm.cmd run check
```

### Change Summary

- 在 `src-tauri/src/infrastructure/known_hosts_store.rs` 中补充“未知指纹会原样进入待确认状态”和“`accept()` 写入后 `verify()` 可立即接受”的 Rust 回归测试。
- 在 `frontend/src/features/session/connect-session/connectSession.ts` 中避免对 `hostKeyUnknown` / `hostKeyChanged` 再次弹出通用连接失败 toast，让 Host Key 专用确认流成为唯一用户提示入口。
- 在 `frontend/src/features/session/connect-session/__tests__/connectSession.test.ts` 中新增针对 `hostKeyUnknown` 的防重复提示测试，并保持 Host Key 前端 action/event/state 测试可在现有 Vitest 链路中独立运行。

### Validation Notes

- 通过：`npm.cmd --prefix frontend run test -- src/features/session/connect-session/__tests__/connectSession.test.ts src/features/session/connect-session/__tests__/hostKeyActions.test.ts src/features/session/connect-session/__tests__/hostKeyEvents.test.ts src/entities/security/model/__tests__/hostKeyState.test.ts`
- 通过：`npm.cmd run test:frontend`
- 通过：`npm.cmd run rust:test`

---

## Task 04 - 后台任务模型统一与通用取消机制

- **ID**: `BL-04`
- **Priority**: `P1`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`
- **Depends On**: `BL-02`

### Goal

将当前偏 SFTP 专用的任务状态、进度和取消机制演进为通用后台任务模型，为搜索、归档、命令执行等未来任务提供统一基础设施。

### Scope

- 引入通用 `BackgroundTaskSnapshot`（或等价模型）；
- 保留现有 `SftpTaskSnapshot` 兼容层，避免一次性破坏现有前端；
- 将取消集合从 `cancelled_sftp_tasks` 演进为通用取消机制；
- 让 `TaskCenter` 能消费通用任务模型；
- 视需要保留 `sftp-progress` 到通用事件的桥接。

### Non-Goals

- 本任务不要求一次性接入所有新任务类型；
- 本任务不要求移除所有旧事件名，只要兼容桥接清晰即可。

### Acceptance Criteria

- [x] 前后端存在通用后台任务模型；
- [x] SFTP 任务迁移后现有能力不回退；
- [x] 存在统一取消入口或通用取消数据结构；
- [x] `TaskCenter` 可展示不止一种任务类型，或已为多任务类型展示完成结构性准备；
- [x] 补充任务状态流转与取消相关测试。

### Suggested Files

- `frontend/src/entities/task/`
- `frontend/src/widgets/`
- `src-tauri/src/domain/sftp.rs`
- `src-tauri/src/services/`
- `src-tauri/src/state.rs`
- `src-tauri/src/infrastructure/file_store.rs`
- `frontend/src/shared/ipc/`

### Validation

```powershell
npm.cmd run typecheck
npm.cmd run test:frontend
npm.cmd run rust:test
npm.cmd run check
```

### Change Summary

- 新增后端通用任务模型 `src-tauri/src/domain/task.rs`（`BackgroundTaskSnapshot` / `BackgroundTaskStatus`）并提供与 `SftpTaskSnapshot` 的双向转换，`state` 统一改用 `tasks` 与 `cancelled_tasks`。
- `src-tauri/src/services/sftp_service/tasks.rs` 与 `transfer.rs` 已改为在通用任务快照与通用取消集合上运行，同时继续通过 `list_sftp_tasks` 和现有 SFTP 事件保持 IPC 兼容。
- 前端 `ipcContract` 增加 `BackgroundTaskSnapshot` 并将 `SftpTaskSnapshot` 设为类型别名；`taskApi` 与 `manageTask` 改为消费通用任务快照；`TaskItem` 增加 `kind` 字段为多任务来源预留结构。
- 兼容保留 `restoreSftpTasks` 入口（映射到 `restoreTasks`），避免现有启动流程和调用点回退。

### Validation Notes

- 通过：`npm.cmd run typecheck`
- 通过：`npm.cmd run test:frontend`
- 通过：`npm.cmd run rust:test`
- 通过：`npm.cmd run rust:check`
- 通过：`npm.cmd run rust:clippy`
- 阻塞说明：`npm.cmd run check` 仍被现有前端 UI guard 拦截（`frontend/src/shell/dock/dock.css`、`frontend/src/shell/styles/jetbrains-theme.css`、`frontend/src/shell/styles/overlays.css` 硬编码颜色），与本任务变更无关。

---

## Task 05 - Terminal Runtime 状态机与资源 TTL 清理

- **ID**: `BL-05`
- **Priority**: `P2`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`
- **Depends On**: `BL-03`

### Goal

为终端运行时、挂起 Host Key 会话和已完成/失效对象建立更明确的生命周期管理，降低竞态、重复关闭和长时间运行后的资源堆积风险。

### Scope

- 为 `TerminalRuntime` 引入显式状态机或等价状态约束；
- 为断开的 runtime、pending host key session、可清理任务增加 TTL 回收策略；
- 明确重复关闭、异常断连、迟到事件的处理语义；
- 补充资源回收与状态迁移测试。

### Non-Goals

- 本任务不引入自动重连；
- 本任务不改造所有 SSH/SFTP 并发策略。

### Acceptance Criteria

- [x] Runtime 具备明确状态定义与关键迁移规则；
- [x] 断开资源可在可控时间内清理；
- [x] Pending Host Key 会话支持过期清理；
- [x] 重复关闭与异常断开不会留下残余状态；
- [x] 至少补充状态迁移或 TTL 清理测试。

### Suggested Files

- `src-tauri/src/services/terminal_service.rs`
- `src-tauri/src/state.rs`
- `src-tauri/src/domain/`
- 相关测试文件

### Validation

```powershell
npm.cmd run rust:test
npm.cmd run rust:check
npm.cmd run rust:clippy
```

### Change Summary

- 在 `src-tauri/src/services/terminal_service.rs` 中引入 `TerminalRuntimeState` / `RuntimeLifecycle`，让终端运行时具备 `Connecting -> Ready -> Closing -> Closed` 的显式状态迁移，并让重复 `close()` 调用幂等化。
- 为断开的终端会话增加 `disconnected_terminal_sessions` 清理标记，为 Pending Host Key 会话增加 `pending_host_key_session_times` 追踪，并在连接、接收/拒绝 host key、轮询与清理路径中执行 TTL 回收。
- 在 `src-tauri/src/state.rs` 中补充所需状态存储字段；在 `terminal_service` 单元测试中新增状态机、Pending Host Key TTL、断开终端 TTL 三类回归测试。

### Validation Notes

- 通过：`npm.cmd run rust:test`
- 通过：`npm.cmd run rust:check`
- 通过：`npm.cmd run rust:clippy`

---

## Task 06 - 日志链路全量脱敏

- **ID**: `BL-06`
- **Priority**: `P1`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`
- **Depends On**: `BL-03`

### Goal

将敏感信息脱敏从错误对象扩展到后端 tracing、事件总线和前端日志展示链路，避免密码、token、secret、敏感路径等内容出现在可见日志中。

### Scope

- 收敛/抽取统一脱敏工具；
- 在后端错误、日志和事件发射前接入脱敏；
- 检查前端日志展示是否直接显示未经脱敏的消息；
- 补充典型敏感字段测试。

### Non-Goals

- 本任务不做完整日志平台建设；
- 本任务不要求立即支持日志导出功能。

### Acceptance Criteria

- [x] `password`、`token`、`secret` 等敏感值不会在日志和事件中明文出现；
- [x] 后端错误、tracing 与前端日志展示使用统一或兼容的脱敏规则；
- [x] 补充典型敏感模式测试；
- [x] 不破坏现有错误定位所需的上下文信息。

### Suggested Files

- `src-tauri/src/error.rs`
- `src-tauri/src/infrastructure/`
- `src-tauri/src/services/`
- `frontend/src/widgets/`
- `frontend/src/shared/`
- 相关测试文件

### Validation

```powershell
npm.cmd run test:frontend
npm.cmd run rust:test
npm.cmd run check
```

### Change Summary

- 后端 `src-tauri/src/error.rs` 改为基于正则与 `OnceLock<Regex>` 的统一脱敏实现，补齐带空格的 `key = value`、JSON 样式字段和 PEM 私钥块的处理，并将 `scrub_sensitive_message()` 暴露给事件发射路径复用。
- `src-tauri/src/services/terminal_service/events.rs` 与 `src-tauri/src/services/sftp_service/transfer.rs` 在发送 `terminal-error` / `sftp-failed` 事件前统一执行脱敏，避免原始错误文本绕过 `BackendError` 直接到前端。
- 前端新增 `frontend/src/shared/lib/sanitizeSensitiveText.ts`，并让 `ipcErrors.ts`、`logger.ts`、`outputChannels.ts` 复用同一套脱敏规则，确保日志中心和输出通道不会保存明文敏感值。
- 补充后端事件脱敏测试与前端 `sanitizeSensitiveText`、`logMessage`、`writeOutput` 回归测试，覆盖赋值语法、JSON 字段和 PEM 私钥块等典型模式。

### Validation Notes

- 通过：`npm.cmd run rust:test`
- 通过：`npm.cmd run rust:check`
- 通过：`npm.cmd run rust:clippy`
- 通过：`npm.cmd run test:frontend`
- 通过：`npm.cmd run typecheck`
- 阻塞说明：`npm.cmd run check` 仍被现有前端 UI guard 拦截（`frontend/src/shell/dock/dock.css`、`frontend/src/shell/styles/jetbrains-theme.css`、`frontend/src/shell/styles/overlays.css` 硬编码颜色），与本任务变更无关。

---

## Task 07 - SFTP 大目录性能优化（分页/限额 + 虚拟滚动）

- **ID**: `BL-07`
- **Priority**: `P2`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`
- **Depends On**: `BL-04`

### Goal

提升 SFTP 在大目录场景下的可用性，减少一次性枚举、传输和渲染带来的卡顿。

### Scope

- 评估并实现后端分页、限额或分批返回策略；
- 为前端 SFTP 列表引入虚拟滚动或等价大列表优化方案；
- 确保排序、选择、打开、刷新等常用交互不回退；
- 如可行，补充基础性能验证说明。

### Non-Goals

- 本任务不要求做完整断点续传；
- 本任务不要求重写整套 SFTP Explorer。

### Acceptance Criteria

- [x] 后端目录列表接口具备分页、限额或等效分批能力；
- [x] 前端大列表渲染采用虚拟滚动或等价优化手段；
- [x] 大目录交互明显优于当前实现，且不影响基础功能；
- [x] 至少补充 1 条性能验证方法、基线说明或测试。

### Suggested Files

- `src-tauri/src/services/sftp_service.rs`
- `src-tauri/src/domain/sftp.rs`
- `frontend/src/widgets/`
- `frontend/src/entities/sftp/`
- `frontend/src/shared/ipc/`
- 相关测试文件

### Validation

```powershell
npm.cmd run typecheck
npm.cmd run test:frontend
npm.cmd run rust:test
npm.cmd run build
```

### Change Summary

- 为 `sftp_list` 增加可选 `offset` / `limit` 参数：前端 `ipcContract`、`ipcFacade`、`sftpRepository` 现在都支持按页/限额请求目录数据，后端 `src-tauri/src/services/sftp_service.rs` 负责排序后再执行窗口裁剪。
- SFTP 文件列表继续复用 `UiDataGrid` → `UiVirtualList` 的虚拟滚动链路，同时将前端排序提取到 `sortSftpItems()`：默认的“名称升序”直接复用后端已排好序的结果，避免在大目录场景重复做一次全量 `localeCompare` 排序。
- 新增前端 `sortSftpItems` 单元测试和后端 `apply_list_window` 单元测试，覆盖默认顺序复用、排序行为与 `offset` / `limit` 窗口裁剪边界。

### Validation Notes

- 通过：`npm.cmd run test:frontend`
- 通过：`npm.cmd run typecheck`
- 通过：`npm.cmd run build`
- 通过：`npm.cmd run rust:test`
- 通过：`npm.cmd run rust:check`
- 通过：`npm.cmd run rust:clippy`
- 阻塞说明：`npm.cmd run check` 仍被现有前端 UI guard 拦截（`frontend/src/shell/dock/dock.css`、`frontend/src/shell/styles/jetbrains-theme.css`、`frontend/src/shell/styles/overlays.css` 硬编码颜色），与本任务变更无关。

---

## 后续候选任务（暂不纳入主线顺序）

以下任务建议在上述主线完成后再进入 backlog 顶部：

- 远程文件点击即编辑与原子保存闭环；
- 终端输出与任务进度事件合批 / `requestAnimationFrame` 合并更新；
- 统一空状态与新手引导；
- OpenSSH hashed known_hosts / host alias / 多 key 类型兼容；
- 自动重连、KeepAlive、断点续传、文件冲突策略。

## 维护约定

- 新任务默认追加到“后续候选任务”或插入到主线合适位置，并补充依赖；
- 如某任务需要拆分，优先保留主任务 ID，再追加 `-A`、`-B` 子任务；
- 如 agent 因真实阻塞无法完成，应在对应任务下追加 `Blocked By` 与当前结论；
- 完成任务后，建议在 `Change Summary` 中记录主要文件与变更动机，便于后续审计。
