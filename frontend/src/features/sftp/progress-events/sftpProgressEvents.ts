import {patchTask, upsertTask} from '../../../entities/task'
import {listenTypedEvent, type SftpFailedEvent, type SftpProgressEvent} from '../../../shared/ipc/ipcEvents'

export async function registerSftpProgressEvents() {
  const disposers = await Promise.all([
    listenTypedEvent('sftp-progress', handleSftpProgress),
    listenTypedEvent('sftp-completed', handleSftpCompleted),
    listenTypedEvent('sftp-failed', handleSftpFailed),
  ])
  return () => disposers.forEach((dispose) => dispose())
}

export function handleSftpProgress(event: SftpProgressEvent) {
  upsertSftpTask(event, {error: undefined, progress: getProgressPercent(event), status: 'running'})
}

export function handleSftpCompleted(event: SftpProgressEvent) {
  upsertSftpTask(event, {error: undefined, progress: 100, status: 'done'})
}

export function handleSftpFailed(event: SftpFailedEvent) {
  upsertSftpTask(event, {error: event.error, status: 'failed'})
}

function upsertSftpTask(event: SftpProgressEvent & {title?: string; detail?: string}, patch: Parameters<typeof patchTask>[1]) {
  upsertTask({
    id: event.taskId,
    title: event.title || 'SFTP transfer',
    detail: event.detail || event.taskId,
    progress: getProgressPercent(event),
    status: 'running',
    ...patch,
  })
}

function getProgressPercent(event: SftpProgressEvent) {
  if (!event.totalBytes || event.totalBytes <= 0) return 0
  return Math.min(100, Math.round((event.transferredBytes / event.totalBytes) * 100))
}
