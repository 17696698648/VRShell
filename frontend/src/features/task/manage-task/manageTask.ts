import {patchTask, type TaskItem} from '../../../entities/task'
import {createTransferTask} from '../../sftp/manage-files/manageSftpFiles'
import {pushToast} from '../../../shared/feedback'
import {typedInvoke} from '../../../shared/ipc/ipcClient'

export async function cancelTask(task: TaskItem) {
  if (task.status !== 'running') return false
  try {
    await typedInvoke('cancel_sftp_task', {taskId: task.id})
    patchTask(task.id, {status: 'cancelled'})
    pushToast({level: 'info', title: `Cancelled ${task.title}`})
    return true
  } catch (error) {
    pushToast({level: 'error', title: `Failed to cancel ${task.title}`, detail: getErrorMessage(error)})
    throw error
  }
}

export async function retryTask(task: TaskItem) {
  if (task.status !== 'failed' && task.status !== 'cancelled') return null
  const kind = getTransferKind(task)
  if (!kind) return null
  return createTransferTask(kind, task.detail)
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
