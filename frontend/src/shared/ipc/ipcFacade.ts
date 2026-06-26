/**
 * IPC Facade - 语义化 API 层
 * 
 * 职责：
 * - 提供领域语义 API（session/terminal/sftp/credential）
 * - 隐藏底层 Tauri command 名称
 * - 作为 repository 与 typedInvoke 之间的适配层
 * 
 * 约束：
 * - 业务代码（features/widgets/pages/shell）只调用 facade，不直接调用 typedInvoke
 * - Repository 只调用 facade，不出现旧式 command name
 */

import {typedInvoke} from './ipcClient'
import type {
  BackendSessionGroup,
  BackendSessionHost,
  ConnectSshArgs,
  CredentialRef,
  SessionTreeActionPayload,
  SessionTreeActionResult,
  SftpConnection,
  SftpTaskSnapshot,
  SftpTransferOptions,
  SshConfigHost,
  AcceptHostKeyArgs,
  HostKeyRequestedEvent,
} from './ipcContract'

// Re-export types for repository consumers
export type {
  BackendSessionGroup,
  BackendSessionHost,
  ConnectSshArgs,
  CredentialRef,
  SessionTreeActionName,
  SessionTreeActionPayload,
  SessionTreeActionResult,
  SessionTreeTargetType,
  SftpConnection,
  SftpEntry,
  SftpTaskSnapshot,
  SftpTransferOptions,
  SshConfigHost,
  AcceptHostKeyArgs,
  HostKeyRequestedEvent,
} from './ipcContract'
export {IpcError} from './ipcErrors'

// ==================== Session API ====================

export const sessionApi = {
  /** 加载会话树 */
  loadTree(): Promise<BackendSessionGroup[]> {
    return typedInvoke('load_session_tree')
  },

  /** 保存会话树 */
  saveTree(sessionTree: BackendSessionGroup[]): Promise<void> {
    return typedInvoke('save_session_tree', {sessionTree})
  },

  /** 应用会话树操作 */
  applyTreeAction(payload: SessionTreeActionPayload): Promise<SessionTreeActionResult> {
    return typedInvoke('apply_session_tree_action', payload)
  },

  /** 导入 SSH Config */
  importSshConfig(): Promise<SshConfigHost[]> {
    return typedInvoke('parse_ssh_config')
  },
}

// ==================== Terminal API ====================

export const terminalApi = {
  /** 打开终端连接 */
  open(request: ConnectSshArgs): Promise<string> {
    return typedInvoke('connect_ssh', request)
  },

  /** 发送输入 */
  write(sessionId: string, dataBase64: string): Promise<void> {
    return typedInvoke('send_input', {sessionId, dataBase64})
  },

  /** 调整 PTY 大小 */
  resize(sessionId: string | null, cols: number, rows: number): Promise<void> {
    return typedInvoke('resize_pty', {sessionId, cols, rows})
  },

  /** 关闭终端 */
  close(sessionId: string): Promise<void> {
    return typedInvoke('disconnect_session', {sessionId})
  },

  /** 轮询输出事件（仅用于 browser/mock fallback） */
  pollEvents(sessionId: string) {
    return typedInvoke('poll_events', {sessionId})
  },
}

// ==================== SFTP File API ====================

export const sftpFileApi = {
  /** 列出远程目录 */
  list(connection: SftpConnection, path: string) {
    return typedInvoke('sftp_list', {connection, path})
  },

  /** 创建远程目录 */
  mkdir(connection: SftpConnection, remotePath: string): Promise<void> {
    return typedInvoke('sftp_mkdir', {connection, remotePath})
  },

  /** 创建远程文件 */
  createFile(connection: SftpConnection, remotePath: string): Promise<void> {
    return typedInvoke('sftp_create_file', {connection, remotePath})
  },

  /** 重命名远程路径 */
  rename(connection: SftpConnection, oldPath: string, newPath: string): Promise<void> {
    return typedInvoke('sftp_rename', {connection, oldPath, newPath})
  },

  /** 删除远程路径 */
  remove(connection: SftpConnection, remotePath: string, isDirectory?: boolean): Promise<void> {
    return typedInvoke('sftp_delete', {connection, remotePath, isDirectory})
  },

  /** 上传文件 */
  upload(
    connection: SftpConnection,
    remotePath: string,
    taskId: string,
    input: {dataBase64?: string; localPath?: string},
    options?: SftpTransferOptions,
  ): Promise<void> {
    return typedInvoke('sftp_upload', {
      connection,
      remotePath,
      dataBase64: input.dataBase64 ?? null,
      localPath: input.localPath ?? null,
      taskId,
      options,
    })
  },

  /** 上传目录 */
  uploadDirectory(
    connection: SftpConnection,
    localPath: string,
    remotePath: string,
    taskId: string,
  ): Promise<void> {
    return typedInvoke('sftp_upload_directory', {connection, localPath, remotePath, taskId})
  },

  /** 下载文件 */
  download(
    connection: SftpConnection,
    remotePath: string,
    taskId: string,
    localPath?: string,
  ): Promise<void> {
    return typedInvoke('sftp_download', {connection, remotePath, taskId, localPath: localPath ?? null})
  },

  /** 读取远程文件 */
  readFile(connection: SftpConnection, remotePath: string): Promise<string> {
    return typedInvoke('sftp_read_file', {connection, remotePath})
  },
}

// ==================== SFTP Task API ====================

export const sftpTaskApi = {
  /** 列出 SFTP 任务 */
  list(): Promise<SftpTaskSnapshot[]> {
    return typedInvoke('list_sftp_tasks')
  },

  /** 取消 SFTP 任务 */
  cancel(taskId: string): Promise<void> {
    return typedInvoke('cancel_sftp_task', {taskId})
  },
}

// ==================== Credential API ====================

export const credentialApi = {
  /** 保存凭据 */
  save(service: string, key: string, value: string): Promise<void> {
    return typedInvoke('keyring_store', {service, key, value})
  },

  /** 获取凭据 */
  get(service: string, key: string): Promise<string | null> {
    return typedInvoke('keyring_get', {service, key})
  },

  /** 删除凭据 */
  delete(service: string, key: string): Promise<void> {
    return typedInvoke('keyring_delete', {service, key})
  },
}

// ==================== Security API ====================

export const securityApi = {
  /** 接受未知 host key 并继续连接 */
  acceptHostKey(args: AcceptHostKeyArgs): Promise<string> {
    return typedInvoke('accept_host_key', args)
  },

  /** 拒绝 host key */
  rejectHostKey(pendingId: string): Promise<void> {
    return typedInvoke('reject_host_key', {pendingId})
  },
}

// ==================== Task API ====================

export type TaskSnapshot = SftpTaskSnapshot

export const taskApi = {
  /** 列出所有后台任务（当前聚合 SFTP 任务） */
  list(): Promise<TaskSnapshot[]> {
    return sftpTaskApi.list()
  },

  /** 取消后台任务 */
  cancel(taskId: string): Promise<void> {
    return sftpTaskApi.cancel(taskId)
  },

  /** 任务重试尚未由后端提供 */
  retry(taskId: string): Promise<never> {
    void taskId
    return Promise.reject(new Error('task retry is not supported yet'))
  },
}

// ==================== Diagnostic API ====================

export const diagnosticApi = {
  /** 测试 SSH 连接（TCP + handshake + auth） */
  testSshConnection(host: string, port: number, username: string): Promise<string> {
    return typedInvoke('test_ssh_connection', {host, port, username})
  },

  /** 测量 TCP 连接延迟（毫秒） */
  tcpLatency(host: string, port: number, timeoutMs?: number): Promise<number> {
    return typedInvoke('tcp_latency', {host, port, timeoutMs: timeoutMs ?? null})
  },
}
