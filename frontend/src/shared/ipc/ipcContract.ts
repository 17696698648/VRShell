export type IpcCommandMap = {
  open_devtools: {args: undefined; result: void}
  load_session_tree: {args: undefined; result: BackendSessionGroup[]}
  save_session_tree: {args: {sessionTree: BackendSessionGroup[]}; result: void}
  session_tree_action: {args: {action: string; targetType: string; targetId: string}; result: SessionTreeActionResult}
  connect_ssh: {args: ConnectSshArgs; result: string}
  disconnect_session: {args: {sessionId: string}; result: void}
  poll_events: {args: {sessionId: string}; result: TerminalOutputEvent[]}
  resize_pty: {args: {sessionId: string | null; cols: number; rows: number}; result: void}
  send_input: {args: {sessionId: string; dataBase64: string}; result: void}
  test_ssh_connection: {args: {host: string; port: number; username: string}; result: string}
  tcp_latency: {args: {host: string; port: number; timeoutMs?: number | null}; result: number}
  parse_ssh_config: {args: undefined; result: SshConfigHost[]}
  apply_session_tree_action: {args: SessionTreeActionPayload; result: SessionTreeActionResult}
  sftp_list: {args: {connection: SftpConnection; path: string}; result: SftpEntry[]}
  sftp_mkdir: {args: {connection: SftpConnection; remotePath: string}; result: void}
  sftp_rename: {args: {connection: SftpConnection; oldPath: string; newPath: string}; result: void}
  sftp_delete: {args: {connection: SftpConnection; remotePath: string; isDirectory?: boolean}; result: void}
  sftp_upload: {args: {connection: SftpConnection; remotePath: string; dataBase64: string; taskId: string; options?: SftpTransferOptions}; result: void}
  sftp_download: {args: {connection: SftpConnection; remotePath: string; taskId: string}; result: string}
  cancel_sftp_task: {args: {taskId: string}; result: void}
  keyring_store: {args: {service: string; key: string; value: string}; result: void}
  keyring_get: {args: {service: string; key: string}; result: string | null}
  keyring_delete: {args: {service: string; key: string}; result: void}
}

export interface TerminalOutputEvent {
  type: 'output'
  dataBase64: string
}

export const ipcCommandNames = [
  'open_devtools',
  'load_session_tree',
  'save_session_tree',
  'session_tree_action',
  'apply_session_tree_action',
  'parse_ssh_config',
  'connect_ssh',
  'send_input',
  'disconnect_session',
  'resize_pty',
  'poll_events',
  'test_ssh_connection',
  'tcp_latency',
  'sftp_list',
  'sftp_mkdir',
  'sftp_rename',
  'sftp_delete',
  'sftp_upload',
  'sftp_download',
  'cancel_sftp_task',
  'keyring_store',
  'keyring_get',
  'keyring_delete',
] as const satisfies readonly (keyof IpcCommandMap)[]

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
  authMethod?: 'agent' | 'password' | 'key'
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
