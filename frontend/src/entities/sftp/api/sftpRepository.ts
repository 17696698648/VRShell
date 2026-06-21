import {typedInvoke, type SftpConnection, type SftpTransferOptions} from '../../../shared/ipc/ipcClient'
import type {SessionHost} from '../../session'
import type {SftpItem} from '../model/sftp.types'

export async function listRemoteDirectory(session: SessionHost, path: string): Promise<SftpItem[]> {
  const entries = await typedInvoke('sftp_list', {connection: toConnection(session), path})
  return entries.map((entry) => {
    const isDirectory = entry.isDirectory ?? entry.is_dir ?? false
    return {
      id: entry.path,
      name: entry.name,
      path: entry.path,
      type: isDirectory ? 'directory' : 'file',
      size: isDirectory ? '-' : formatEntrySize(entry.size, entry.sizeBytes),
      modifiedAt: entry.modified ? new Date(entry.modified * 1000).toLocaleDateString() : '-',
    }
  })
}

export function mkdirRemoteDirectory(session: SessionHost, remotePath: string) {
  return typedInvoke('sftp_mkdir', {connection: toConnection(session), remotePath})
}

export function renameRemotePath(session: SessionHost, oldPath: string, newPath: string) {
  return typedInvoke('sftp_rename', {connection: toConnection(session), oldPath, newPath})
}

export function deleteRemotePath(session: SessionHost, remotePath: string, isDirectory: boolean) {
  return typedInvoke('sftp_delete', {connection: toConnection(session), remotePath, isDirectory})
}

export function uploadRemoteFile(session: SessionHost, remotePath: string, dataBase64: string, taskId: string, options?: SftpTransferOptions) {
  return typedInvoke('sftp_upload', {connection: toConnection(session), remotePath, dataBase64, taskId, options})
}

export function downloadRemoteFile(session: SessionHost, remotePath: string, taskId: string) {
  return typedInvoke('sftp_download', {connection: toConnection(session), remotePath, taskId})
}

function toConnection(session: SessionHost): SftpConnection {
  return {
    host: session.host,
    port: session.port,
    username: session.username,
    password: session.auth?.type === 'password' ? session.auth.password : null,
    privateKeyPath: session.auth?.type === 'key' ? session.auth.privateKeyPath : null,
    passphrase: session.auth?.type === 'key' ? session.auth.passphrase : null,
  }
}

function formatEntrySize(size: string | number, sizeBytes?: number) {
  if (typeof size === 'string') return size
  return formatBytes(sizeBytes ?? size)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
