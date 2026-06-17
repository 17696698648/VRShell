import { computed, reactive } from 'vue'
import { cancelSftpTask, createSftpTaskId, formatSftpError, getSftpSessionKey, type SftpConnection } from '../services/sftp'
import type { SftpTask } from '../types'

export function useSftpTask(getConnection: () => SftpConnection, setStatus?: (message: string) => void) {
  const currentTask = reactive<SftpTask>({
    id: '',
    type: 'upload',
    status: 'idle',
    progress: 0,
    currentFile: '',
    error: '',
    cancelable: false,
    sessionKey: '',
    deleted: 0,
  })

  const progressView = computed(() => ({
    active: currentTask.status === 'queued' || currentTask.status === 'running' || currentTask.status === 'canceling',
    taskId: currentTask.id,
    sessionKey: currentTask.sessionKey,
    operation: currentTask.type,
    file: currentTask.currentFile,
    percent: currentTask.progress,
    deleted: currentTask.deleted,
    status: currentTask.status,
    error: currentTask.error,
    cancelable: currentTask.cancelable,
  }))

  function beginTask(type: SftpTask['type']) {
    const connection = getConnection()
    currentTask.id = createSftpTaskId(type)
    currentTask.type = type
    currentTask.status = 'running'
    currentTask.progress = 0
    currentTask.currentFile = ''
    currentTask.error = ''
    currentTask.cancelable = true
    currentTask.sessionKey = getSftpSessionKey(connection)
    currentTask.deleted = 0
    return currentTask.id
  }

  function applyProgress(payload: { taskId: string; sessionKey: string; operation: SftpTask['type']; file: string; transferred: number; total: number; deleted: number }) {
    if (payload.sessionKey !== currentTask.sessionKey || payload.taskId !== currentTask.id) {
      return false
    }

    const total = Math.max(0, payload.total)
    currentTask.status = 'running'
    currentTask.type = payload.operation
    currentTask.currentFile = payload.file
    currentTask.deleted = payload.deleted
    currentTask.progress = payload.operation === 'delete'
      ? 0
      : total > 0 ? Math.min(100, Math.round((payload.transferred / total) * 100)) : 0
    return true
  }

  function finishTask() {
    currentTask.status = 'success'
    currentTask.progress = currentTask.type === 'delete' ? currentTask.progress : 100
    currentTask.cancelable = false
    window.setTimeout(() => {
      if (currentTask.status === 'success') {
        currentTask.status = 'idle'
      }
    }, 900)
  }

  function failTask(error: unknown) {
    const message = formatSftpError(error)
    currentTask.status = message.toLowerCase().includes('canceled') ? 'canceled' : 'error'
    currentTask.error = message
    currentTask.cancelable = false
  }

  async function cancelCurrentTask() {
    if (!currentTask.id || !currentTask.cancelable) {
      return
    }

    currentTask.status = 'canceling'
    setStatus?.('Canceling SFTP task...')
    await cancelSftpTask(currentTask.id)
  }

  return {
    currentTask,
    progressView,
    beginTask,
    applyProgress,
    finishTask,
    failTask,
    cancelCurrentTask,
  }
}
