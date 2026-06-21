# VRShell 后端完全重构设计建议

## 重构原则

本次后端按“完全重构”处理：原有 `.rs` 文件已经迁移到备份目录，不再以旧实现为基础继续拆分。新后端只保留产品目标、前端 IPC 需求和 `ui设计方案.md` 中的工作台架构方向，重新设计模块边界、状态模型和服务层。

## 已执行动作

- 原 `src-tauri/src/*.rs` 已迁移到 `backups/legacy-rs-files-20260621-134555`。
- 新建最小可编译后端骨架，避免旧 SSH/SFTP/host-key/keyring 实现继续影响架构。
- 保留现有前端可能调用的核心 IPC 命令名，内部暂以明确的 `notImplemented` 错误或内存占位实现承接。
- 已集中定义 IPC command 名、DTO、事件名和基础契约测试，为前端 typed IPC 提供稳定边界。
- 已新增 `infrastructure/file_store.rs`，`load_session_tree` / `save_session_tree` 切换为带版本的文件持久化。
- 已新增纯 SSH config 解析器和 `infrastructure/ssh_config_store.rs`，`parse_ssh_config` 返回标准 import DTO。
- 已新增 `CredentialRef`、`credential_service` 和 `keyring_store`，session 数据只保存凭据引用。
- 已实现 typed `apply_session_tree_action`，支持 create/edit/delete/move/touch，并保留旧 `session_tree_action` 兼容入口。
- 前端 `shared/ipc` 和 `entities/session/api/sessionRepository` 已同步 typed action payload。

## 推荐后端架构

```text
src-tauri/src/
  main.rs                  # 进程入口，只调用 app::run
  app.rs                   # Tauri builder、插件、全局状态注入
  commands.rs              # IPC command adapter，只做参数接收和结果映射
  ipc/                     # 前端可见 DTO、事件、错误结构
    contract.rs            # command 名称白名单与契约测试
    dto.rs                 # IPC request/response DTO
    events.rs              # 事件名和事件 payload
  domain/                  # 纯领域模型，不依赖 Tauri/ssh2/keyring
    session.rs
    terminal.rs
    sftp.rs
    security.rs
    workspace.rs
  services/                # 应用服务，编排领域和基础设施
    session_service.rs
    terminal_service.rs
    sftp_service.rs
    credential_service.rs
    security_service.rs
  infrastructure/          # 外部能力适配层
    ssh_client.rs
    sftp_client.rs
    keyring_store.rs
    known_hosts_store.rs
    file_store.rs
  state.rs                 # 运行态 registry，避免散落全局锁
  error.rs                 # 统一错误模型
```

## 与 UI 设计方案的对应关系

- 前端 `shared/ipc` 只调用后端 `commands.rs` 暴露的 typed IPC。
- 前端 `entities/session` 对应后端 `domain/session.rs` 和 `session_service.rs`。
- 前端 `entities/terminal` 对应后端 `domain/terminal.rs`、`terminal_service.rs`、`ssh_client.rs`。
- 前端 `entities/sftp` 对应后端 `domain/sftp.rs`、`sftp_service.rs`、`sftp_client.rs`。
- 前端 command registry 不直接关心 SSH/SFTP 实现，只依赖 IPC command ID 和结构化错误。

## IPC 设计建议

### 命令分层

```text
session.loadTree
session.saveTree
session.importSshConfig
terminal.open
terminal.write
terminal.resize
terminal.close
sftp.list
sftp.upload
sftp.download
sftp.mkdir
sftp.rename
sftp.remove
credential.save
credential.read
security.acceptHostKey
```

如果短期需要兼容旧前端，可以在 `commands.rs` 中保留旧命令名，例如 `connect_ssh`、`sftp_list`，但内部应立即转换成新的 service request。

### 错误结构

```json
{
  "code": "notImplemented | validationError | authFailed | hostKeyRejected | networkUnavailable",
  "message": "safe user-facing message",
  "recoverable": true,
  "details": {}
}
```

错误 message 必须默认脱敏，不允许包含密码、私钥路径、passphrase、完整本地路径等敏感信息。

### 事件结构

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

高频 terminal output 不进入前端响应式 store；后端按 session id 发送事件，前端写入 TerminalInstanceRegistry。

## 状态设计建议

- `BackendState` 只保存 registry，不保存复杂业务规则。
- terminal session 使用 `TerminalRegistry` 管理生命周期、输入通道、输出事件、退出状态。
- SFTP session 使用连接池，key 为 `host:port:username`，带 idle timeout 和显式 dispose。
- task 使用 `TaskRegistry`，支持 progress、cancel、retry、失败原因。
- credential 不进入普通 state，统一经 `CredentialService` 和系统 keyring。

## 实施里程碑

### M1：后端基础设施

- 已完成 `error`、`ipc`、`domain`、`services` 基础目录。
- 已固化 typed IPC DTO、command 白名单和事件名。
- 已建立内存版 session store 和 terminal registry。
- 已加入 command 名唯一性、事件名唯一性、DTO camelCase、错误序列化基础测试。
- 下一步补 `infrastructure` 目录，并先实现文件持久化与 migration。

### M2：Session 与持久化

- 已实现 session tree 文件存储。
- 已实现 migration/version 基础契约。
- 已实现 SSH config import，输出标准 `SshConfigHost` DTO。
- 已接入 credential 引用，不在 session JSON 明文保存密码。
- 已实现 session tree create/edit/delete/move/touch 领域操作。
- 已引入 typed action payload，并保留字符串三参数兼容入口。
- 下一步补前端 repository 类型映射和更细的 action payload 校验。

### M3：Terminal

- 实现 SSH client adapter。
- 实现 terminal open/write/resize/close。
- 实现输出事件、退出事件、错误事件。
- 实现 reconnect 策略和连接状态机。

### M4：Security/Credential

- 实现系统 keyring adapter。
- 实现 known_hosts store。
- 实现 host key 指纹确认流程。
- 实现错误脱敏和审计日志。

### M5：SFTP

- 实现 SFTP list/page。
- 实现 upload/download 任务队列。
- 实现 mkdir/rename/remove。
- 实现 cancel/retry/progress 事件。

### M6：质量与发布

- 建立 unit test + integration test 分层。
- 对 SSH/SFTP 外部依赖使用 feature flag 或 mock server。
- 增加日志、诊断导出和崩溃恢复。
- 补齐前后端 IPC contract 测试。

## 当前代码状态

新后端当前是“架构骨架 + IPC 占位实现”：

- `load_session_tree` / `save_session_tree` 已使用 `session-tree.v1.json` 文件持久化。
- `connect_ssh` 创建内存 terminal session id，但不建立真实 SSH 连接。
- `poll_events` 返回空数组。
- SFTP、keyring、terminal input/resize 等返回结构化 `notImplemented`。
- `ipc/contract.rs` 维护兼容期 command 名白名单。
- `ipc/dto.rs` 维护前端可见 request/response DTO。
- `ipc/events.rs` 维护事件名与高频事件 payload。

这样做的目的是先锁定干净边界，避免旧后端实现继续牵引新架构。后续每个功能应按 service + infrastructure adapter 的方式独立落地。
