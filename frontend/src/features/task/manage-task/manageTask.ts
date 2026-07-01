import {patchTask, upsertTask, type TaskItem} from '../../../entities/task'
import {messages} from '../../../shared/copy'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {notifyTaskFailure} from '../../../shared/feedback'
import {taskApi, type BackgroundTaskSnapshot} from '../../../shared/ipc/ipcFacade'
import {createTransferTask} from '../../sftp/manage-files/manageSftpFiles'

export async function restoreBackgroundTasks() {
  const snapshots = await taskApi.list()
  snapshots.forEach((snapshot) => upsertTask(toTaskItem(snapshot)))
  return snapshots.length
}

export const restoreSftpTasks = restoreBackgroundTasks

export function toTaskItem(snapshot: BackgroundTaskSnapshot): TaskItem {
  return {
    id: snapshot.taskId,
    kind: snapshot.kind,
    title: snapshot.title || 'Background task',
    detail: snapshot.detail || snapshot.taskId,
    error: snapshot.error ?? undefined,
    progress: getProgressPercent(snapshot),
    status: snapshot.status,
    traceId: snapshot.traceId ?? undefined,
  }
}

export async function cancelTask(task: TaskItem) {
  if (task.status !== 'running') return false
  try {
    await taskApi.cancel(task.id)
    patchTask(task.id, {error: undefined, status: 'cancelled'})
    return true
  } catch (error) {
    const message = getErrorMessage(error)
    patchTask(task.id, {error: message})
    notifyTaskFailure({action: 'cancel-failed', taskId: task.id, title: messages.task.failures.cancel(task.title), error, traceId: task.traceId})
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

function getProgressPercent(snapshot: BackgroundTaskSnapshot) {
  if (snapshot.status === 'done') return 100
  const totalBytes = snapshot.progress.totalBytes
  if (!totalBytes || totalBytes <= 0) return 0
  return Math.min(100, Math.round((snapshot.progress.transferredBytes / totalBytes) * 100))
}

function getTransferKind(task: TaskItem): 'upload' | 'download' | null {
  const title = task.title.toLowerCase()
  if (title.startsWith('upload')) return 'upload'
  if (title.startsWith('download')) return 'download'
  return null
}
