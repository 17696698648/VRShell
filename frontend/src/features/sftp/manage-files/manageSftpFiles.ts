import {openSessionEditorFile} from '../../../entities/editor'
import {getActiveSession} from '../../../entities/session'
import {deleteRemotePath, downloadRemoteFile, mkdirRemoteDirectory, readRemoteFile, renameRemotePath, uploadRemoteFile} from '../../../entities/sftp/api/sftpRepository'
import {addTask, patchTask} from '../../../entities/task'
import {sftpState, type SftpItem} from '../../../entities/sftp'
import {pushToast} from '../../../shared/feedback'
import {decodeTextBase64, encodeTextBase64} from '../../../shared/lib/base64'
import {createId} from '../../../shared/lib/createId'

export async function createRemoteDirectory(name: string) {
  const session = requireActiveSession()
  const trimmedName = name.trim()
  if (!trimmedName) return null
  const path = joinRemotePath(sftpState.path, trimmedName)
  await mkdirRemoteDirectory(session, path)
  const item: SftpItem = {id: path, name: trimmedName, path, type: 'directory', size: '-', modifiedAt: 'Now'}
  sftpState.items.unshift(item)
  pushToast({level: 'success', title: `Created ${trimmedName}`})
  return item
}

export async function deleteRemoteItem(item: SftpItem) {
  const session = requireActiveSession()
  await deleteRemotePath(session, item.path, item.type === 'directory')
  sftpState.items = sftpState.items.filter((candidate) => candidate.id !== item.id)
  pushToast({level: 'success', title: `Deleted ${item.name}`})
}

export async function renameRemoteItem(item: SftpItem, name: string) {
  const session = requireActiveSession()
  const trimmedName = name.trim()
  if (!trimmedName) return null
  const nextPath = joinRemotePath(parentRemotePath(item.path), trimmedName)
  await renameRemotePath(session, item.path, nextPath)
  Object.assign(item, {id: nextPath, name: trimmedName, path: nextPath, modifiedAt: 'Now'})
  pushToast({level: 'success', title: `Renamed to ${trimmedName}`})
  return item
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
  } catch (error) {
    pushToast({level: 'error', title: `Open ${item.name} failed`, detail: getErrorMessage(error)})
    throw error
  }
}

export async function createTransferTask(kind: 'upload' | 'download', detail: string) {
  const session = requireActiveSession()
  const taskId = createId(`sftp-${kind}`)
  addTask({id: taskId, title: `${capitalize(kind)} file`, detail, progress: 0, status: 'running'})
  try {
    if (kind === 'upload') await uploadRemoteFile(session, joinRemotePath(detail, 'upload.txt'), encodeTextBase64(''), taskId)
    else await downloadRemoteFile(session, detail, taskId)
    patchTask(taskId, {progress: 100, status: 'done'})
    pushToast({level: 'success', title: `${capitalize(kind)} queued`, detail})
  } catch (error) {
    patchTask(taskId, {status: 'failed'})
    pushToast({level: 'error', title: `${capitalize(kind)} failed`, detail: getErrorMessage(error)})
    throw error
  }
  return taskId
}

function requireActiveSession() {
  const session = getActiveSession()
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

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
