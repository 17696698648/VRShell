import {invoke} from '@tauri-apps/api/core'
import type {SessionGroup} from '../components/SessionTreeGroup.vue'
import type {SftpUploadSummary} from '../types'
import type {ConnectSshOptions} from './terminal'
import type {SftpConnection, SftpEntry, SftpListPage, SftpSessionRef, SftpTransferOptions} from './sftp'
import type {HostKeyInfo, SecuritySettingsInfo, SshConfigHost, TestSshConnectionOptions} from './ssh'

export type IpcArgs = object

export interface IpcContract {
  connect_ssh: {args: ConnectSshOptions; result: string}
  disconnect_session: {args: {sessionId: string}; result: void}
  poll_events: {args: {sessionId: string}; result: string[]}
  resize_pty: {args: {sessionId: string | null; cols: number; rows: number}; result: void}
  send_input: {args: {sessionId: string; dataBase64: string}; result: void}
  tcp_latency: {args: {host: string; port: number}; result: number}
  test_ssh_connection: {args: TestSshConnectionOptions; result: number}
  parse_ssh_config: {args: undefined; result: SshConfigHost[]}
  get_host_key_fingerprint: {args: {host: string; port: number}; result: string}
  get_pending_host_key_info: {args: {host: string; port: number}; result: HostKeyInfo}
  get_security_settings: {args: undefined; result: SecuritySettingsInfo}
  accept_host_key: {args: {host: string; port: number}; result: void}
  remove_known_host: {args: {host: string; port: number}; result: string[]}

  load_session_tree: {args: undefined; result: SessionGroup[]}
  save_session_tree: {args: {groups: SessionGroup[]}; result: void}

  sftp_list: {args: {connection: SftpConnection | SftpSessionRef; path: string}; result: SftpEntry[]}
  sftp_list_page: {args: {connection: SftpConnection | SftpSessionRef; path: string; offset?: number; limit?: number}; result: SftpListPage}
  sftp_upload: {args: {connection: SftpConnection | SftpSessionRef; remotePath: string; dataBase64: string; taskId: string; options?: SftpTransferOptions}; result: void}
  sftp_upload_many: {args: {connection: SftpConnection | SftpSessionRef; files: Array<{remotePath: string; dataBase64: string}>; taskId: string; options?: SftpTransferOptions}; result: SftpUploadSummary}
  sftp_upload_paths: {args: {connection: SftpConnection | SftpSessionRef; files: Array<{localPath: string; remotePath: string}>; taskId: string; options?: SftpTransferOptions}; result: SftpUploadSummary}
  sftp_download: {args: {connection: SftpConnection | SftpSessionRef; remotePath: string; taskId: string}; result: string}
  sftp_download_to_path: {args: {connection: SftpConnection | SftpSessionRef; remotePath: string; localPath: string; taskId: string; options?: SftpTransferOptions}; result: void}
  sftp_mkdir: {args: {connection: SftpConnection | SftpSessionRef; remotePath: string}; result: void}
  sftp_mkdir_p: {args: {connection: SftpConnection | SftpSessionRef; remotePath: string}; result: void}
  sftp_rename: {args: {connection: SftpConnection | SftpSessionRef; oldPath: string; newPath: string}; result: void}
  sftp_delete: {args: {connection: SftpConnection | SftpSessionRef; remotePath: string; isDirectory: boolean}; result: void}
  sftp_delete_recursive: {args: {connection: SftpConnection | SftpSessionRef; remotePath: string; taskId: string}; result: void}
  cancel_sftp_task: {args: {taskId: string}; result: void}
  set_sftp_idle_timeout: {args: {seconds: number}; result: void}
  disconnect_sftp_session: {args: SftpSessionRef; result: void}
}

export function typedInvoke<K extends keyof IpcContract>(
  command: K,
  ...args: IpcContract[K]['args'] extends undefined ? [] : [IpcContract[K]['args']]
): Promise<IpcContract[K]['result']>
export function typedInvoke<T>(command: string, args?: IpcArgs): Promise<T>
export function typedInvoke(command: string, args?: IpcArgs) {
  return invoke(command, args as Record<string, unknown> | undefined)
}
