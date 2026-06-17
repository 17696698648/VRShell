import {invoke} from '@tauri-apps/api/core'
import type {SftpUploadSummary} from '../types'
import {formatAppError} from './errors'

export type SftpConnection = {
  host: string
  port: number
  username: string
  password: string | null
  privateKeyPath?: string | null
  passphrase?: string | null
}

export type SftpSessionRef = Pick<SftpConnection, 'host' | 'port' | 'username'>

const establishedSftpSessions = new Set<string>()

export type SftpError = {
  code: string
  message: string
  path?: string | null
  recoverable: boolean
}

export function formatSftpError(error: unknown) {
  return formatAppError(error, 'SFTP error')
}

export type SftpEntry = {
  name: string
  path: string
  size: string
  sizeBytes?: number
  modified?: number
  isDirectory: boolean
}

export function createSftpTaskId(operation: string) {
  return `${operation}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getSftpSessionKey(connection: SftpSessionRef) {
  return `${connection.username}@${connection.host}:${connection.port}`
}

function getSftpInvokeConnection(connection: SftpConnection): SftpConnection | SftpSessionRef {
  return establishedSftpSessions.has(getSftpSessionKey(connection))
    ? {host: connection.host, port: connection.port, username: connection.username}
    : connection
}

async function invokeSftp<T>(command: string, connection: SftpConnection, args: Record<string, unknown> = {}) {
  const invokeConnection = getSftpInvokeConnection(connection)
  const result = await invoke<T>(command, {...invokeConnection, ...args})
  establishedSftpSessions.add(getSftpSessionKey(connection))
  return result
}

export async function listSftpDirectory(connection: SftpConnection, path: string) {
  return invokeSftp<SftpEntry[]>('sftp_list', connection, {path})
}

export async function uploadSftpFile(connection: SftpConnection, remotePath: string, dataBase64: string, taskId = createSftpTaskId('upload')) {
  await invokeSftp('sftp_upload', connection, {remotePath, dataBase64, taskId})
}

export async function uploadSftpFiles(connection: SftpConnection, files: Array<{
  remotePath: string;
  dataBase64: string
}>, taskId = createSftpTaskId('upload')) {
  return invokeSftp<SftpUploadSummary>('sftp_upload_many', connection, {files, taskId})
}

export async function uploadSftpLocalPaths(connection: SftpConnection, files: Array<{
  localPath: string;
  remotePath: string
}>, taskId = createSftpTaskId('upload')) {
  return invokeSftp<SftpUploadSummary>('sftp_upload_paths', connection, {files, taskId})
}

export async function downloadSftpFile(connection: SftpConnection, remotePath: string, taskId = createSftpTaskId('download')) {
  return invokeSftp<string>('sftp_download', connection, {remotePath, taskId})
}

export async function downloadSftpFileToPath(connection: SftpConnection, remotePath: string, localPath: string, taskId = createSftpTaskId('download')) {
  await invokeSftp('sftp_download_to_path', connection, {remotePath, localPath, taskId})
}

export async function createSftpFile(connection: SftpConnection, remotePath: string) {
  await uploadSftpFile(connection, remotePath, '')
}

export async function createSftpDirectory(connection: SftpConnection, remotePath: string) {
  await invokeSftp('sftp_mkdir', connection, {remotePath})
}

export async function renameSftpItem(connection: SftpConnection, oldPath: string, newPath: string) {
  await invokeSftp('sftp_rename', connection, {oldPath, newPath})
}

export async function deleteSftpItem(connection: SftpConnection, remotePath: string, isDirectory: boolean) {
  await invokeSftp('sftp_delete', connection, {remotePath, isDirectory})
}

export async function deleteSftpDirectoryRecursive(connection: SftpConnection, remotePath: string, taskId = createSftpTaskId('delete')) {
  await invokeSftp('sftp_delete_recursive', connection, {remotePath, taskId})
}

export async function cancelSftpTask(taskId: string) {
  await invoke('cancel_sftp_task', {taskId})
}

export async function setSftpIdleTimeout(seconds: number) {
  await invoke('set_sftp_idle_timeout', {seconds})
}

export async function disconnectSftpConnection(connection: SftpSessionRef) {
  await invoke('disconnect_sftp_session', connection)
  establishedSftpSessions.delete(getSftpSessionKey(connection))
}
