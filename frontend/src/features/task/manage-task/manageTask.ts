import {patchTask, upsertTask, type TaskItem} from '../../../entities/task'
import {listSftpTasks} from '../../../entities/sftp/api/sftpRepository'
import {messages} from '../../../shared/copy'
import {notifyTaskFailure} from '../../../shared/feedback'
import {sftpTaskApi, type SftpTaskSnapshot} from '../../../shared/ipc/ipcFacade'
import {createTransferTask} from '../../sftp/manage-files/manageSftpFiles'

export async function restoreSftpTasks() {
  const snapshots = await listSftpTasks()
  snapshots.forEach((snapshot) => upsertTask(toTaskItem(snapshot)))
  return snapshots.length
}

export function toTaskItem(snapshot: SftpTaskSnapshot): TaskItem {
  return {
    id: snapshot.taskId,
    title: snapshot.title || 'SFTP transfer',
    detail: snapshot.detail || snapshot.taskId,
    error: snapshot.error ?? undefined,
    progress: getProgressPercent(snapshot),
    status: snapshot.status,
  }
}

export async function cancelTask(task: TaskItem) {
  if (task.status !== 'running') return false
  try {
    await sftpTaskApi.cancel(task.id)
    patchTask(task.id, {error: undefined, status: 'cancelled'})
    return true
  } catch (error) {
    const message = getErrorMessage(error)
    patchTask(task.id, {error: message})
    notifyTaskFailure({action: 'cancel-failed', taskId: task.id, title: messages.task.failures.cancel(task.title), detail: message})
    throw error
  }
}

export async function retryTask(task: TaskItem) {
  if (task.status !== 'failed' && task.status !== 'cancelled') return null
  const kind = getTransferKind(task)
  if (!kind) return null
  patchTask(task.id, {error: undefined})
  return createTransferTask(kind, task.detail)
}

function getProgressPercent(snapshot: SftpTaskSnapshot) {
  if (snapshot.status === 'done') return 100
  if (!snapshot.totalBytes || snapshot.totalBytes <= 0) return 0
  return Math.min(100, Math.round((snapshot.transferredBytes / snapshot.totalBytes) * 100))
}

function getTransferKind(task: TaskItem): 'upload' | 'download' | null {
  const title = task.title.toLowerCase()
  if (title.startsWith('upload')) return 'upload'
  if (title.startsWith('download')) return 'download'
  return null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

