import {open, save} from '@tauri-apps/plugin-dialog'
import {openSessionEditorFile, patchSessionEditorFile, type SessionEditorFile} from '../../../entities/editor'
import {getActiveSession, sessionState} from '../../../entities/session'
import {createRemoteFilePath, deleteRemotePath, downloadRemoteFile, mkdirRemoteDirectory, readRemoteFile, renameRemotePath, uploadRemoteDirectory, uploadRemoteFile} from '../../../entities/sftp/api/sftpRepository'
import {addTask, patchTask} from '../../../entities/task'
import {sftpState, type SftpItem} from '../../../entities/sftp'
import {workspaceState} from '../../../entities/workspace'
import {openTasksPanel} from '../../workspace/open-logs-panel'
import {messages} from '../../../shared/copy'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {notifyFeedback, notifySftpFailure} from '../../../shared/feedback'
import {decodeTextBase64, encodeTextBase64} from '../../../shared/lib/base64'
import {createId} from '../../../shared/lib/createId'

export async function createRemoteDirectory(name: string, parentPath = sftpState.path) {
  const session = requireActiveSession()
  const trimmedName = name.trim()
  if (!trimmedName) return null
  const path = joinRemotePath(parentPath, trimmedName)
  try {
    await mkdirRemoteDirectory(session, path)
    const item: SftpItem = {id: path, name: trimmedName, path, type: 'directory', size: '-', modifiedAt: 'Now'}
    if (parentPath === sftpState.path) sftpState.items.unshift(item)
    notifyFeedback({level: 'success', title: messages.sftp.success.createDirectory(trimmedName), detail: path})
    return item
  } catch (error) {
    notifySftpFailure({action: 'create-directory-failed', path, title: messages.sftp.failures.createDirectory(trimmedName), error})
    throw error
  }
}

export async function createRemoteFile(name: string, parentPath = sftpState.path) {
  const session = requireActiveSession()
  const trimmedName = name.trim()
  if (!trimmedName) return null
  const path = joinRemotePath(parentPath, trimmedName)
  try {
    await createRemoteFilePath(session, path)
    const item: SftpItem = {id: path, name: trimmedName, path, type: 'file', size: '0 B', modifiedAt: 'Now'}
    if (parentPath === sftpState.path) sftpState.items.unshift(item)
    notifyFeedback({level: 'success', title: messages.sftp.success.createFile(trimmedName), detail: path})
    return item
  } catch (error) {
    notifySftpFailure({action: 'create-file-failed', path, title: messages.sftp.failures.createFile(trimmedName), error})
    throw error
  }
}

export async function deleteRemoteItem(item: SftpItem) {
  const session = requireActiveSession()
  try {
    await deleteRemotePath(session, item.path, item.type === 'directory')
    sftpState.items = sftpState.items.filter((candidate) => candidate.id !== item.id)
    notifyFeedback({level: 'success', title: messages.sftp.success.deleteItem(item.name), detail: item.path})
  } catch (error) {
    notifySftpFailure({action: 'delete-failed', path: item.path, title: messages.sftp.failures.deleteItem(item.name), error})
    throw error
  }
}

export async function renameRemoteItem(item: SftpItem, name: string) {
  const session = requireActiveSession()
  const trimmedName = name.trim()
  if (!trimmedName) return null
  const originalName = item.name
  const nextPath = joinRemotePath(parentRemotePath(item.path), trimmedName)
  try {
    await renameRemotePath(session, item.path, nextPath)
    Object.assign(item, {id: nextPath, name: trimmedName, path: nextPath, modifiedAt: 'Now'})
    notifyFeedback({level: 'success', title: messages.sftp.success.renameItem(trimmedName), detail: nextPath})
    return item
  } catch (error) {
    notifySftpFailure({action: 'rename-failed', path: item.path, title: messages.sftp.failures.renameItem(originalName), error})
    throw error
  }
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

export async function uploadFileToRemoteDirectory(remoteDirectory: string) {
  const selected = await open({multiple: false, directory: false})
  if (!selected) return null
  const localPath = Array.isArray(selected) ? selected[0] : selected
  const fileName = localBaseName(localPath)
  const remotePath = joinRemotePath(remoteDirectory, fileName)
  const item: SftpItem = {id: remotePath, name: fileName, path: remotePath, type: 'file', size: '-', modifiedAt: 'Now'}
  await runTransferTask('upload', remotePath, async (session, taskId) => {
    await uploadRemoteFile(session, remotePath, taskId, {localPath})
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

export async function saveRemoteEditorFile(file: SessionEditorFile) {
  patchSessionEditorFile(file.id, {saving: true, error: undefined})
  try {
    await runTransferTask('upload', file.path, async (session, taskId) => {
      await uploadRemoteFile(session, file.path, taskId, {dataBase64: encodeTextBase64(file.content)})
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
  const taskId = createId(`sftp-${kind}`)
  openTasksPanel()
  addTask({id: taskId, title: `${capitalize(kind)} file`, detail, progress: 0, status: 'running'})
  try {
    await run(session, taskId)
  } catch (error) {
    const message = getErrorMessage(error)
    patchTask(taskId, {error: message, status: 'failed'})
    notifySftpFailure({action: `${kind}-failed`, taskId, title: messages.sftp.failures.transfer(kind), error})
    throw error
  }
  patchTask(taskId, {error: undefined, progress: 100, status: 'done'})
  notifyFeedback({level: 'success', title: `${capitalize(kind)} completed`, detail})
  return taskId
}

function requireActiveSession() {
  const session = sessionState.sessions.find((item) => item.id === sftpState.connectedSessionId) ?? getActiveSession()
  if (!session) throw new Error('No active session')
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

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}
