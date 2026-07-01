import {open, save} from '@tauri-apps/plugin-dialog'
import {openSessionEditorFile, patchSessionEditorFile, type SessionEditorFile} from '../../../entities/editor'
import {getActiveSession, sessionState} from '../../../entities/session'
import {createRemoteFilePath, deleteRemotePath, downloadRemoteFile, mkdirRemoteDirectory, readRemoteFile, renameRemotePath, uploadRemoteDirectory, uploadRemoteFile} from '../../../entities/sftp/api/sftpRepository'
import {sftpState, type SftpItem} from '../../../entities/sftp'
import {workspaceState} from '../../../entities/workspace'
import {openTasksPanel} from '../../workspace/open-logs-panel'
import {messages} from '../../../shared/copy'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {notifyFeedback, notifySftpFailure} from '../../../shared/feedback'
import {decodeTextBase64, encodeTextBase64} from '../../../shared/lib/base64'
import type {SftpTransferOptions} from '../../../shared/ipc/ipcFacade'
import {runSftpOperationTask, transferFailureTitle, transferSuccessTitle, transferTitle} from './sftpOperationTasks'

export async function createRemoteDirectory(name: string, parentPath = sftpState.path) {
  const session = requireActiveSession()
  const trimmedName = name.trim()
  if (!trimmedName) return null
  const path = joinRemotePath(parentPath, trimmedName)
  return runSftpOperationTask({
    kind: 'create-directory',
    path,
    title: `Create folder ${trimmedName}`,
    failureTitle: messages.sftp.failures.createDirectory(trimmedName),
    retryContext: {name: trimmedName, parentPath},
    run: async () => {
      await mkdirRemoteDirectory(session, path)
      return {id: path, name: trimmedName, path, type: 'directory', size: '-', modifiedAt: 'Now'} satisfies SftpItem
    },
    success: (_taskId, item) => {
      if (parentPath === sftpState.path) sftpState.items.unshift(item)
      notifyFeedback({level: 'success', title: messages.sftp.success.createDirectory(trimmedName), detail: path})
    },
  })
}

export async function createRemoteFile(name: string, parentPath = sftpState.path) {
  const session = requireActiveSession()
  const trimmedName = name.trim()
  if (!trimmedName) return null
  const path = joinRemotePath(parentPath, trimmedName)
  return runSftpOperationTask({
    kind: 'create-file',
    path,
    title: `Create file ${trimmedName}`,
    failureTitle: messages.sftp.failures.createFile(trimmedName),
    retryContext: {name: trimmedName, parentPath},
    run: async () => {
      await createRemoteFilePath(session, path)
      return {id: path, name: trimmedName, path, type: 'file', size: '0 B', modifiedAt: 'Now'} satisfies SftpItem
    },
    success: (_taskId, item) => {
      if (parentPath === sftpState.path) sftpState.items.unshift(item)
      notifyFeedback({level: 'success', title: messages.sftp.success.createFile(trimmedName), detail: path})
    },
  })
}

export async function deleteRemoteItem(item: SftpItem) {
  const session = requireActiveSession()
  await runSftpOperationTask({
    kind: 'delete',
    path: item.path,
    title: `Delete ${item.name}`,
    failureTitle: messages.sftp.failures.deleteItem(item.name),
    retryContext: {item},
    run: async () => deleteRemotePath(session, item.path, item.type === 'directory'),
    success: () => {
      sftpState.items = sftpState.items.filter((candidate) => candidate.id !== item.id)
      notifyFeedback({level: 'success', title: messages.sftp.success.deleteItem(item.name), detail: item.path})
    },
  })
}

export async function renameRemoteItem(item: SftpItem, name: string) {
  const session = requireActiveSession()
  const trimmedName = name.trim()
  if (!trimmedName) return null
  const originalName = item.name
  const originalPath = item.path
  const nextPath = joinRemotePath(parentRemotePath(item.path), trimmedName)
  return runSftpOperationTask({
    kind: 'rename',
    path: originalPath,
    title: `Rename ${originalName}`,
    failureTitle: messages.sftp.failures.renameItem(originalName),
    retryContext: {item, name: trimmedName},
    run: async () => {
      await renameRemotePath(session, originalPath, nextPath)
      Object.assign(item, {id: nextPath, name: trimmedName, path: nextPath, modifiedAt: 'Now'})
      return item
    },
    success: () => notifyFeedback({level: 'success', title: messages.sftp.success.renameItem(trimmedName), detail: nextPath}),
  })
}

export async function openRemoteFileInSessionEditor(item: SftpItem) {
  if (item.type === 'directory') return
  const session = requireActiveSession()
  try {
    const contentBase64 = await readRemoteFile(session, item.path)
    openSessionEditorFile({
      id: `sftp:${session.id}:${item.path}`,
      sessionId: session.id,
      path: item.path,
      title: item.name,
      content: decodeTextBase64(contentBase64),
    })
    workspaceState.activeMainView = 'editor'
  } catch (error) {
    notifySftpFailure({action: 'open-failed', path: item.path, title: messages.sftp.failures.openFile(item.name), error})
    throw error
  }
}

export async function uploadFileToRemoteDirectory(remoteDirectory: string, options?: SftpTransferOptions) {
  const selected = await open({multiple: false, directory: false})
  if (!selected) return null
  const localPath = Array.isArray(selected) ? selected[0] : selected
  const fileName = localBaseName(localPath)
  const remotePath = joinRemotePath(remoteDirectory, fileName)
  const item: SftpItem = {id: remotePath, name: fileName, path: remotePath, type: 'file', size: '-', modifiedAt: 'Now'}
  await runTransferTask('upload', remotePath, async (session, taskId) => {
    await uploadRemoteFile(session, remotePath, taskId, {localPath}, options)
    if (isCurrentRemoteDirectory(remoteDirectory)) addOrReplaceItem(item)
  })
  return item
}

export async function uploadFolderToRemoteDirectory(remoteDirectory: string) {
  const selected = await open({multiple: false, directory: true})
  if (!selected) return null
  const localPath = Array.isArray(selected) ? selected[0] : selected
  const folderName = localBaseName(localPath)
  const remotePath = joinRemotePath(remoteDirectory, folderName)
  const item: SftpItem = {id: remotePath, name: folderName, path: remotePath, type: 'directory', size: '-', modifiedAt: 'Now'}
  await runTransferTask('upload', remotePath, async (session, taskId) => {
    await uploadRemoteDirectory(session, localPath, remotePath, taskId)
    if (isCurrentRemoteDirectory(remoteDirectory)) addOrReplaceItem(item)
  })
  return item
}

export async function downloadRemoteItem(item: SftpItem) {
  if (item.type === 'directory') return null
  const localPath = await save({defaultPath: item.name})
  if (!localPath) return null
  return runTransferTask('download', item.path, async (session, taskId) => {
    await downloadRemoteFile(session, item.path, taskId, localPath)
  })
}

export async function retrySftpOperation(context: Record<string, unknown>) {
  const kind = context.kind
  if (kind === 'create-directory' && typeof context.name === 'string' && typeof context.parentPath === 'string') return createRemoteDirectory(context.name, context.parentPath)
  if (kind === 'create-file' && typeof context.name === 'string' && typeof context.parentPath === 'string') return createRemoteFile(context.name, context.parentPath)
  if (kind === 'delete' && isSftpItem(context.item)) return deleteRemoteItem(context.item)
  if (kind === 'rename' && isSftpItem(context.item) && typeof context.name === 'string') return renameRemoteItem(context.item, context.name)
  if (kind === 'download' && typeof context.path === 'string') {
    const item: SftpItem = {id: context.path, name: context.path.split('/').filter(Boolean).pop() ?? context.path, path: context.path, type: 'file', size: '-', modifiedAt: '-'}
    return downloadRemoteItem(item)
  }
  if (kind === 'upload' && typeof context.remoteDirectory === 'string') return uploadFileToRemoteDirectory(context.remoteDirectory)
  return null
}

export async function saveRemoteEditorFile(file: SessionEditorFile) {
  patchSessionEditorFile(file.id, {saving: true, error: undefined})
  try {
    await runTransferTask('upload', file.path, async (session, taskId) => {
      await uploadRemoteFile(session, file.path, taskId, {dataBase64: encodeTextBase64(file.content)}, {conflict: 'overwrite'})
    })
    patchSessionEditorFile(file.id, {dirty: false, saving: false, error: undefined})
  } catch (error) {
    const message = getErrorMessage(error)
    patchSessionEditorFile(file.id, {saving: false, error: message})
    throw error
  }
}

export async function createTransferTask(kind: 'upload' | 'download', detail: string) {
  if (kind === 'upload') return uploadFileToRemoteDirectory(detail)
  const item: SftpItem = {id: detail, name: detail.split('/').filter(Boolean).pop() ?? detail, path: detail, type: 'file', size: '-', modifiedAt: '-'}
  return downloadRemoteItem(item)
}

async function runTransferTask(kind: 'upload' | 'download', detail: string, run: (session: ReturnType<typeof requireActiveSession>, taskId: string) => Promise<void>) {
  const session = requireActiveSession()
  openTasksPanel()
  return runSftpOperationTask({
    kind,
    path: detail,
    title: transferTitle(kind),
    failureTitle: transferFailureTitle(kind),
    run: async (taskId) => {
      await run(session, taskId)
      return taskId
    },
    retryContext: {kind, path: detail, remoteDirectory: kind === 'upload' ? parentRemotePath(detail) : undefined},
    success: () => notifyFeedback({level: 'success', title: transferSuccessTitle(kind), detail}),
  })
}

function isSftpItem(value: unknown): value is SftpItem {
  return Boolean(value && typeof value === 'object' && 'id' in value && 'name' in value && 'path' in value && 'type' in value)
}

function requireActiveSession() {
  const session = sessionState.sessions.find((item) => item.id === sftpState.connectedSessionId) ?? getActiveSession()
  if (!session) throw new Error('No active session')
  if (session.status !== 'connected' || !session.backendSessionId) {
    const message = messages.reconnect.sftpDisconnected
    notifyFeedback({level: 'warning', title: messages.reconnect.sftpReconnectTitle, detail: message, dedupeKey: `sftp:${session.id}:disconnected`})
    throw new Error(message)
  }
  return session
}

function joinRemotePath(basePath: string, name: string) {
  return `${basePath.replace(/\/$/, '')}/${name}`
}

function parentRemotePath(path: string) {
  const parts = path.split('/').filter(Boolean).slice(0, -1)
  return parts.length > 0 ? `/${parts.join('/')}` : '/'
}

function localBaseName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

function addOrReplaceItem(item: SftpItem) {
  sftpState.items = [item, ...sftpState.items.filter((candidate) => candidate.id !== item.id)]
}

function isCurrentRemoteDirectory(path: string) {
  return normalizeRemotePath(path) === normalizeRemotePath(sftpState.path)
}

function normalizeRemotePath(path: string) {
  const normalized = path.trim().replace(/\/+$/, '')
  return normalized || '/'
}
