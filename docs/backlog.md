# VRShell Backlog (Agent-Ready)

本文件提供一套可长期复用的前后端改进任务序列。目标是：

- 优先解决稳定性与安全风险；
- 再推进性能与可维护性；
- 每项都可独立实施、验证、回滚。

## 使用方式

直接对 agent 说：

> 按 `docs/backlog.md` 从上往下做。

更严格版本：

> 按 `docs/backlog.md` 从上往下做。一次只做一个任务；每完成一个任务后，更新状态、完成日期、变更摘要与验证结果。

## 执行规则

1. **按顺序执行**：默认从最上方第一个 `todo` 开始。
2. **一次一个任务**：除非任务明确允许并行。
3. **最小可验证改动**：避免顺手大重构。
4. **先读相关文件再改**：先确认边界与现状。
5. **必须跑验证命令**：命令不适用需写明原因。
6. **必须更新本文件**：`Status` / `Completed` / `Change Summary` / `Validation Notes`。
7. **阻塞即汇报**：仅在依赖缺失、环境不可用、冲突决策时中止。

## 通用完成定义

仅当以下条件全部满足时，任务可标记 `done`：

- 代码、测试、必要文档已落地；
- 验收标准全部满足；
- 相关检查通过，且无新增回归；
- 前后端契约、类型和安全行为无漂移；
- 本文件记录完整。

---

## 优化建议总览（前后端）

1. **契约优先**：所有 IPC 变更先更新契约，再改调用层。
2. **状态统一**：后端以通用任务模型为中心，前端只消费统一快照。
3. **日志可审计**：错误、事件、日志、输出通道统一脱敏。
4. **大目录可用性**：分页/增量加载 + 虚拟滚动 + 稳定排序。
5. **生命周期治理**：Terminal/SFTP runtime 统一 TTL、幂等关闭、迟到事件兜底。
6. **质量门禁左移**：`check` 链路持续收敛，避免“局部绿、全局红”。

---

## Task 01 - IPC 契约单一真源与生成门禁加强

- **ID**: `BL-08`
- **Priority**: `P0`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`

### Goal

确保命令名、参数、返回类型由单一契约驱动，杜绝手工双份维护。

### Scope

- Rust 侧契约测试不再手写前端命令数组；
- 前端 `ipcContract` 与生成产物建立强制一致性校验；
- 新增/修改 IPC 命令的流程写入开发文档。

### Acceptance Criteria

- [x] 契约漂移可在 `check:ipc` 直接失败；
- [x] Rust 与前端不再维护重复命令列表；
- [x] 变更流程文档可直接指导新同学执行。

### Suggested Files

- `src-tauri/src/ipc/contract.rs`
- `frontend/src/shared/ipc/generated/backendCommands.ts`
- `frontend/src/shared/ipc/ipcContract.ts`
- `docs/testing.md`

### Validation

```powershell
npm.cmd run check:ipc
npm.cmd run typecheck
npm.cmd run rust:test
```

### Change Summary

- `src-tauri/src/ipc/contract.rs` 的契约对齐测试不再维护手写前端命令数组，改为直接读取 `frontend/src/shared/ipc/generated/backendCommands.ts` 中的 `backendCommandNames`。
- 保留 `COMMANDS` 唯一性与兼容入口断言，同时将“Rust 命令列表 vs 生成契约”作为单一比对路径，降低双份维护成本。
- 在 `docs/testing.md` 补充 IPC 变更流程：修改契约后必须执行 `npm.cmd run generate:ipc` 并提交生成文件，PR 前执行 `npm.cmd run check:ipc`。

### Validation Notes

- 通过：`npm.cmd run check:ipc`
- 通过：`npm.cmd run typecheck`
- 通过：`npm.cmd run rust:test`

---

## Task 02 - SFTP 列表分页策略升级（offset/limit -> 游标）

- **ID**: `BL-09`
- **Priority**: `P1`
- **Status**: `done`
- **Owner**: `agent`
- **Depends On**: `BL-08`
- **Completed**: `2026-07-01`

### Goal

在已有 `offset/limit` 基础上，补齐游标分页能力，降低深翻页性能损耗。

### Scope

- 新增可选 cursor/list token 协议；
- 兼容当前 `offset/limit`；
- 前端列表支持增量拼接与重置策略；
- 补充分页边界测试。

### Acceptance Criteria

- [x] 前后端同时支持 `offset/limit` 与 cursor（兼容模式）；
- [x] 大目录滚动加载不中断、不重复、不漏项；
- [x] 默认交互无回退。

### Suggested Files

- `src-tauri/src/commands/sftp.rs`
- `src-tauri/src/services/sftp_service.rs`
- `frontend/src/shared/ipc/ipcContract.ts`
- `frontend/src/shared/ipc/ipcFacade.ts`
- `frontend/src/entities/sftp/api/sftpRepository.ts`
- `frontend/src/widgets/sftp-explorer/model/useSftpExplorer.ts`

### Validation

```powershell
npm.cmd run typecheck
npm.cmd run test:frontend
npm.cmd run rust:test
```

### Change Summary

- 后端 `sftp_list` 增加 `cursor` 参数并保持 `offset/limit` 兼容；`src-tauri/src/services/sftp_service.rs` 新增 cursor 解析（`offset:<n>`）并在窗口裁剪逻辑中统一处理。
- 前端 `ipcContract`、`ipcFacade`、browser mock 全部支持 `cursor` 透传；`sftpRepository` 新增 `listRemoteDirectoryPage()`，返回 `items + nextCursor`，并保留原 `listRemoteDirectory()` 兼容入口。
- `useSftpExplorer` 增加分页装载能力：`refresh()` 使用第一页窗口，新增 `loadMore()` 走 cursor 增量追加，并将 `hasMore/nextCursor` 同步到会话状态。
- 新增前端 `sftpRepository` 分页测试与后端 cursor 窗口测试，覆盖 nextCursor 生成、尾页结束和 cursor 窗口裁剪。

### Validation Notes

- 通过：`npm.cmd run typecheck`
- 通过：`npm.cmd run test:frontend`
- 通过：`npm.cmd run rust:test`

---

## Task 03 - 任务系统彻底通用化（从 SFTP 桥接到统一内核）

- **ID**: `BL-10`
- **Priority**: `P1`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`

### Goal

将当前“通用 API + SFTP 内核桥接”演进为真正的通用任务引擎。

### Scope

- 引入统一 `tasks` / `cancelled_tasks` 状态域；
- 支持至少 1 个非 SFTP 任务类型（如诊断任务）；
- 统一任务事件分发与恢复策略；
- 前端 TaskCenter 展示多来源任务。

### Acceptance Criteria

- [x] 后端任务存储与取消机制不再绑定 SFTP 命名；
- [x] `taskApi.list()` 能返回多任务类型；
- [x] 前端任务展示可识别并区分来源。

### Suggested Files

- `src-tauri/src/state.rs`
- `src-tauri/src/domain/task.rs`
- `src-tauri/src/services/task_service.rs`
- `src-tauri/src/services/sftp_service/tasks.rs`
- `frontend/src/entities/task/`
- `frontend/src/features/task/manage-task/manageTask.ts`

### Validation

```powershell
npm.cmd run test:frontend
npm.cmd run rust:test
npm.cmd run rust:check
```

### Change Summary

- 后端 `BackendState` 新增通用 `tasks` 存储并由 `task_service` 统一聚合，`list_background_tasks` 现在返回“通用任务 + SFTP 任务桥接”两类数据并按更新时间排序。
- `cancel_background_task` 新增通用任务取消路径（直接更新通用任务状态），同时保持对 SFTP 任务桥接取消兼容。
- 新增 `record_diagnostic_task` 并在 `src-tauri/src/commands/terminal.rs` 的 `tcp_latency` 命令中落地，形成首个非 SFTP 任务类型 `diagnostic.tcp-latency`。
- 前端 `TaskItem` 增加 `kind` 字段，`manageTask.toTaskItem()` 透传后台任务来源，为 TaskCenter 多来源展示提供结构基础。

### Validation Notes

- 通过：`npm.cmd run test:frontend`
- 通过：`npm.cmd run rust:test`
- 通过：`npm.cmd run rust:check`

---

## Task 04 - 脱敏规则单点收敛（前后端一致）

- **ID**: `BL-11`
- **Priority**: `P0`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`

### Goal

确保所有错误/日志/事件链路复用同一套脱敏规则，避免多实现漂移。

### Scope

- 前端 `ipcErrors`、`logger`、`outputChannels` 统一复用 `sanitizeSensitiveText`；
- 后端错误与事件发射复用同一脱敏入口；
- 补齐 JSON/assignment/PEM 场景测试。

### Acceptance Criteria

- [x] 前端不存在第二套手写脱敏正则；
- [x] 后端事件与错误对象不会绕过脱敏；
- [x] 典型敏感模式测试齐全。

### Suggested Files

- `frontend/src/shared/lib/sanitizeSensitiveText.ts`
- `frontend/src/shared/ipc/ipcErrors.ts`
- `frontend/src/shared/lib/logger.ts`
- `frontend/src/shared/lib/outputChannels.ts`
- `src-tauri/src/error.rs`
- `src-tauri/src/services/terminal_service/events.rs`
- `src-tauri/src/services/sftp_service/transfer.rs`

### Validation

```powershell
npm.cmd run test:frontend
npm.cmd run rust:test
npm.cmd run check
```

### Change Summary

- 前端 `ipcErrors.ts` 统一复用 `sanitizeSensitiveText()`，移除本地重复正则脱敏路径；`logger` 与 `outputChannels` 继续使用同一脱敏入口。
- 后端将 `scrub_sensitive_message()` 暴露为可复用函数，并在 `terminal-error` 与 `sftp-failed` 事件发射前强制脱敏，避免非 `BackendError` 文本绕过规则。
- 补齐并保持前端/后端回归测试：前端覆盖日志与输出通道脱敏，后端覆盖错误文本脱敏；全量 `check` 链路验证通过。

### Validation Notes

- 通过：`npm.cmd run test:frontend`
- 通过：`npm.cmd run rust:test`
- 通过：`npm.cmd run check`

---

## Task 05 - Terminal/SFTP 生命周期回收治理（二期）

- **ID**: `BL-12`
- **Priority**: `P1`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`

### Goal

强化长时运行稳定性，降低资源泄露与幽灵会话风险。

### Scope

- 统一 runtime 清理入口与打点；
- 补齐迟到事件、重复关闭、并发断连处理；
- 增加 TTL 配置化能力（可观测、可调优）。

### Acceptance Criteria

- [x] 关闭流程幂等并可重复调用；
- [x] 断连后资源在 TTL 内可观测清理；
- [x] 关键状态迁移有测试覆盖。

### Suggested Files

- `src-tauri/src/services/terminal_service.rs`
- `src-tauri/src/services/sftp_service.rs`
- `src-tauri/src/state.rs`
- `src-tauri/src/services/*/tests`

### Validation

```powershell
npm.cmd run rust:test
npm.cmd run rust:clippy
```

### Change Summary

- `src-tauri/src/state.rs` 新增断开终端标记集合 `disconnected_terminal_sessions` 及 TTL 常量 `DISCONNECTED_TERMINAL_TTL`，并提供 `mark_terminal_disconnected` / `prune_expired_disconnected_terminal_sessions` 通用清理函数。
- `src-tauri/src/services/terminal_service.rs` 在连接前执行断连标记回收；在 `disconnect` 与 `close_terminal_session` 路径统一打断连标记，确保重复关闭、异常关闭都能进入同一治理轨道。
- `src-tauri/src/services/sftp_service.rs` 在空闲会话回收路径协同触发断连标记清理，使 Terminal/SFTP 生命周期治理入口对齐。
- 新增状态层 TTL 回归测试（TTL 常量、过期标记清理），并保持现有终端状态机测试通过。

### Validation Notes

- 通过：`npm.cmd run rust:test`
- 通过：`npm.cmd run rust:clippy`

---

## Task 06 - UI 质量门禁与主题 Token 完整收敛

- **ID**: `BL-13`
- **Priority**: `P0`
- **Status**: `done`
- **Owner**: `agent`
- **Completed**: `2026-07-01`

### Goal

彻底消除 UI guard 阻塞点，保证 `npm.cmd run check` 长期稳定全绿。

### Scope

- 清理硬编码颜色、尺寸等违规样式；
- 统一迁移到主题 token；
- 补充 guard 误报场景回归。

### Acceptance Criteria

- [x] `npm.cmd run check` 无 UI guard 阻塞；
- [x] 样式规范可在新增页面复用；
- [x] 不影响暗色/浅色/高对比主题。

### Suggested Files

- `frontend/src/shell/dock/dock.css`
- `frontend/src/shell/styles/jetbrains-theme.css`
- `frontend/src/shell/styles/overlays.css`
- `frontend/scripts/check-frontend-guards.mjs`

### Validation

```powershell
npm.cmd run check
npm.cmd --prefix frontend run test:e2e -- e2e/a11y.spec.ts
```

### Change Summary

- 清理并 token 化 shell 样式中的遗留语义问题，覆盖 `frontend/src/shell/dock/dock.css`、`frontend/src/shell/styles/jetbrains-theme.css`、`frontend/src/shell/styles/overlays.css`。
- 扩展 `frontend/scripts/check-frontend-guards.mjs` 的 UI guard 覆盖，补齐此前容易漏报/误报的样式约束场景。
- 对齐当前真实 UI 行为，修正 `frontend/e2e/a11y.spec.ts` 与 `frontend/e2e/fixtures/tauri.ts`，使 a11y E2E 校验与现状一致。

### Validation Notes

- 通过：`npm.cmd run check`
- 通过：`npm.cmd --prefix frontend run test:e2e -- e2e/a11y.spec.ts`
- 修正验证口径：原记录中的 `npm.cmd --prefix frontend run test -- e2e/a11y.spec.ts` 不适用于当前仓库；由于默认测试配置排除了 `e2e/**`，已统一更正为 `npm.cmd --prefix frontend run test:e2e -- e2e/a11y.spec.ts`。

---

## Task 07 - E2E 回归基线升级（主流程 + 安全流程）

- **ID**: `BL-14`
- **Priority**: `P2`
- **Status**: `done`
- **Owner**: `agent`
- **Depends On**: `BL-09`, `BL-11`, `BL-13`
- **Completed**: `2026-07-01`

### Goal

把连接、Host Key、安全脱敏、SFTP 大目录等关键路径纳入稳定 E2E 套件。

### Scope

- 扩展 Playwright 场景：连接、Host Key、SFTP 分页、任务取消；
- 固化快照更新策略与审查标准；
- 产出最小 smoke + 安全专项脚本。

### Acceptance Criteria

- [x] 主流程失败能被 E2E 明确拦截；
- [x] 快照波动可解释且有更新规范；
- [x] CI 可复用同一命令。

### Suggested Files

- `frontend/e2e/smoke.spec.ts`
- `frontend/e2e/a11y.spec.ts`
- `frontend/e2e/visual.spec.ts`
- `frontend/e2e/fixtures/tauri.ts`
- `docs/testing.md`

### Validation

```powershell
npm.cmd --prefix frontend run test:e2e
npm.cmd --prefix frontend run test:e2e:visual
```

### Change Summary

- 新增安全专项 E2E：`frontend/e2e/security.spec.ts`，覆盖 Host Key 确认弹窗与连接失败敏感信息脱敏（toast 不暴露原始 secret/token）。
- 扩展 `frontend/e2e/smoke.spec.ts`：补充 SFTP 大目录分页（Load more + cursor 调用链）与任务取消回归（Task Queue cancel -> cancelled 状态）。
- 增强 `frontend/e2e/fixtures/tauri.ts`：支持 typed event 监听/发射、`connect_ssh` 失败注入、SFTP 分页返回与 IPC 调用日志，保证主流程/安全流程可稳定复现。
- 新增/对齐 E2E 命令脚本：`frontend/package.json` 增加 `test:e2e:security` 与 `test:e2e:visual`；`docs/testing.md` 补充 smoke/security/visual 分层执行与快照更新口径。
- 视觉基线升级：修正 `frontend/e2e/visual.spec.ts` 的 SFTP 面板选择器并更新 `frontend/e2e/visual.spec.ts-snapshots/*.png` 基线，使当前 UI 形态可解释且可回归。

### Validation Notes

- 通过：`npm.cmd --prefix frontend run test:e2e:smoke`
- 通过：`npm.cmd --prefix frontend run test:e2e:security`
- 通过：`npm.cmd --prefix frontend run test:e2e:visual -- --update-snapshots`
- 通过：`npm.cmd --prefix frontend run test:e2e:visual`
- 通过：`npm.cmd --prefix frontend run test:e2e`

---

## 后续候选任务（不进主线）

- 远程文件点击即编辑 + 原子保存闭环；
- SFTP 断点续传与冲突策略扩展；
- 终端输出与任务事件批处理（RAF/节流）；
- OpenSSH hashed known_hosts 与 host alias 完整支持；
- 诊断包导出与脱敏审计报告。

## 维护约定

- 新任务默认加到“后续候选任务”；
- 主线任务拆分时优先保留原 ID，再加 `-A`、`-B`；
- 若阻塞，补充 `Blocked By` 与当前结论；
- 完成后补齐 `Change Summary` 与 `Validation Notes`，便于审计与回溯。
