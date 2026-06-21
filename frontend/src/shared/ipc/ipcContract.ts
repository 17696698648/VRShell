export type IpcCommandMap = {
  connect_ssh: {args: ConnectSshArgs; result: string}
  disconnect_session: {args: {sessionId: string}; result: void}
  poll_events: {args: {sessionId: string}; result: string[]}
  resize_pty: {args: {sessionId: string | null; cols: number; rows: number}; result: void}
  send_input: {args: {sessionId: string; dataBase64: string}; result: void}
  parse_ssh_config: {args: undefined; result: SshConfigHost[]}
  apply_session_tree_action: {args: SessionTreeActionPayload; result: SessionTreeActionResult}
  sftp_list: {args: {connection: SftpConnection; path: string}; result: SftpEntry[]}
  sftp_mkdir: {args: {connection: SftpConnection; remotePath: string}; result: void}
  sftp_rename: {args: {connection: SftpConnection; oldPath: string; newPath: string}; result: void}
  sftp_delete: {args: {connection: SftpConnection; remotePath: string; isDirectory?: boolean}; result: void}
  sftp_upload: {args: {connection: SftpConnection; remotePath: string; dataBase64: string; taskId: string; options?: SftpTransferOptions}; result: void}
  sftp_download: {args: {connection: SftpConnection; remotePath: string; taskId: string}; result: string}
  cancel_sftp_task: {args: {taskId: string}; result: void}
}

export interface SftpTransferOptions {
  overwrite?: boolean
  resume?: boolean
}

export interface ConnectSshArgs {
  host: string
  port: number
  username: string
  password?: string | null
  privateKeyPath?: string | null
  passphrase?: string | null
  autoReconnect: boolean
  idleTimeoutSecs: number
}

export interface SshConfigHost {
  alias: string
  host: string
  hostname: string
  user?: string | null
  port: number
  identityFile?: string | null
}

export interface CredentialRef {
  service: string
  key: string
}

export interface BackendSessionHost {
  id?: string | null
  name: string
  user: string
  address: string
  port: number
  authMethod?: string
  remark?: string
  credentialRef?: CredentialRef | null
}

export interface BackendSessionGroup {
  id: string
  name: string
  icon?: string
  hosts?: BackendSessionHost[]
  children?: BackendSessionGroup[]
}

export type SessionTreeActionName = 'create' | 'edit' | 'delete' | 'move' | 'touch'
export type SessionTreeTargetType = 'group' | 'host'

export interface SessionTreeActionPayload {
  action: SessionTreeActionName
  targetType: SessionTreeTargetType
  targetId: string
  destinationGroupId?: string | null
  group?: BackendSessionGroup | null
  host?: BackendSessionHost | null
}

export interface SessionTreeActionResult {
  action: string
  targetType: string
  targetId: string
  message: string
}

export interface SftpConnection {
  host: string
  port: number
  username: string
  password?: string | null
  privateKeyPath?: string | null
  passphrase?: string | null
}

export interface SftpEntry {
  name: string
  path: string
  isDirectory?: boolean
  is_dir?: boolean
  size: string | number
  sizeBytes?: number
  modified: number | null
}
