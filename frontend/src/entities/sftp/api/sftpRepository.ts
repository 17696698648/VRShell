import {sftpFileApi, sftpTaskApi, type SftpConnection, type SftpTaskSnapshot, type SftpTransferOptions} from '../../../shared/ipc/ipcFacade'
import type {SessionHost} from '../../session'
import type {SftpItem} from '../model/sftp.types'

export interface SftpListPage {
  items: SftpItem[]
  nextCursor: string | null
}

export async function listRemoteDirectory(session: SessionHost, path: string, options?: {offset?: number; limit?: number; cursor?: string}): Promise<SftpItem[]> {
  const page = await listRemoteDirectoryPage(session, path, options)
  return page.items
}

export async function listRemoteDirectoryPage(session: SessionHost, path: string, options?: {offset?: number; limit?: number; cursor?: string}): Promise<SftpListPage> {
  const entries = await sftpFileApi.list(toConnection(session), path, options)
  const items = entries.map((entry) => {
    const isDirectory = entry.isDirectory ?? false
    const itemType: SftpItem['type'] = isDirectory ? 'directory' : 'file'
    return {
      id: entry.path,
      name: entry.name,
      path: entry.path,
      type: itemType,
      size: isDirectory ? '-' : formatEntrySize(entry.size, entry.sizeBytes),
      modifiedAt: entry.modified ? new Date(entry.modified * 1000).toLocaleDateString() : '-',
    }
  })

  const resolvedOffset = options?.cursor ? decodeCursor(options.cursor) ?? options.offset ?? 0 : options?.offset ?? 0
  const resolvedLimit = options?.limit ?? entries.length
  const hasNext = entries.length === resolvedLimit && resolvedLimit > 0

  return {
    items,
    nextCursor: hasNext ? encodeCursor(resolvedOffset + entries.length) : null,
  }
}

export function mkdirRemoteDirectory(session: SessionHost, remotePath: string) {
  return sftpFileApi.mkdir(toConnection(session), remotePath)
}

export function createRemoteFilePath(session: SessionHost, remotePath: string) {
  return sftpFileApi.createFile(toConnection(session), remotePath)
}

export function renameRemotePath(session: SessionHost, oldPath: string, newPath: string) {
  return sftpFileApi.rename(toConnection(session), oldPath, newPath)
}

export function deleteRemotePath(session: SessionHost, remotePath: string, isDirectory: boolean) {
  return sftpFileApi.remove(toConnection(session), remotePath, isDirectory)
}

export function uploadRemoteFile(session: SessionHost, remotePath: string, taskId: string, input: {dataBase64?: string; localPath?: string}, options?: SftpTransferOptions) {
  return sftpFileApi.upload(toConnection(session), remotePath, taskId, input, options)
}

export function uploadRemoteDirectory(session: SessionHost, localPath: string, remotePath: string, taskId: string) {
  return sftpFileApi.uploadDirectory(toConnection(session), localPath, remotePath, taskId)
}

export function downloadRemoteFile(session: SessionHost, remotePath: string, taskId: string, localPath?: string) {
  return sftpFileApi.download(toConnection(session), remotePath, taskId, localPath)
}

export function readRemoteFile(session: SessionHost, remotePath: string) {
  return sftpFileApi.readFile(toConnection(session), remotePath)
}

export function listSftpTasks(): Promise<SftpTaskSnapshot[]> {
  return sftpTaskApi.list()
}

function toConnection(session: SessionHost): SftpConnection {
  return {
    host: session.host,
    port: session.port,
    username: session.username,
    password: session.auth?.type === 'password' ? session.auth.password : null,
    privateKeyPath: session.auth?.type === 'key' ? session.auth.privateKeyPath : null,
    passphrase: session.auth?.type === 'key' ? session.auth.passphrase : null,
    authMethod: session.auth?.type,
    credentialRef: session.auth?.type === 'password' ? session.auth.credentialRef : null,
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

function encodeCursor(offset: number) {
  return `offset:${offset}`
}

function decodeCursor(cursor: string) {
  if (!cursor.startsWith('offset:')) return null
  const value = Number.parseInt(cursor.slice('offset:'.length), 10)
  return Number.isNaN(value) ? null : value
}

