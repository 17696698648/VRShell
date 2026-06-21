import {patchTask} from '../../../entities/task'
import {listenTypedEvent, type SftpProgressEvent} from '../../../shared/ipc/ipcEvents'

export async function registerSftpProgressEvents() {
  const disposers = await Promise.all([
    listenTypedEvent('sftp.progress', handleSftpProgress),
    listenTypedEvent('sftp.completed', (event) => handleSftpCompleted(event)),
    listenTypedEvent('sftp.failed', (event) => handleSftpFailed(event.error ? {...event, error: event.error} : event)),
  ])
  return () => disposers.forEach((dispose) => dispose())
}

export function handleSftpProgress(event: SftpProgressEvent) {
  patchTask(event.taskId, {
    progress: getProgressPercent(event),
    status: 'running',
  })
}

export function handleSftpCompleted(event: SftpProgressEvent) {
  patchTask(event.taskId, {
    progress: 100,
    status: 'done',
  })
}

export function handleSftpFailed(event: SftpProgressEvent & {error?: string}) {
  patchTask(event.taskId, {
    status: 'failed',
  })
}

function getProgressPercent(event: SftpProgressEvent) {
  if (!event.totalBytes || event.totalBytes <= 0) return 0
  return Math.min(100, Math.round((event.transferredBytes / event.totalBytes) * 100))
}
