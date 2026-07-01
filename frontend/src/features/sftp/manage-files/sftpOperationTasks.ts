import {addTask, patchTask, taskItems, type TaskItem} from '../../../entities/task'
import {messages} from '../../../shared/copy'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {notifyFeedback, notifySftpFailure} from '../../../shared/feedback'
import {createId} from '../../../shared/lib/createId'

export type SftpOperationKind = 'create-directory' | 'create-file' | 'delete' | 'rename' | 'refresh' | 'upload' | 'download'

interface SftpOperationInput<T> {
  kind: SftpOperationKind
  path: string
  title: string
  detail?: string
  duplicateTitle?: string
  failureTitle: string
  retryContext?: Record<string, unknown>
  run: (taskId: string) => Promise<T>
  success?: (taskId: string, result: T) => void
}

const runningOperationKeys = new Set<string>()

export async function runSftpOperationTask<T>(input: SftpOperationInput<T>) {
  const operationKey = createOperationKey(input.kind, input.path)
  if (runningOperationKeys.has(operationKey)) {
    notifyFeedback({
      level: 'warning',
      title: input.duplicateTitle ?? 'SFTP action already running',
      detail: input.path,
      dedupeKey: `sftp:${operationKey}:duplicate`,
    })
    return null
  }

  const taskId = createId(`sftp-${input.kind}`)
  runningOperationKeys.add(operationKey)
  addTask(createTask(input, taskId))
  try {
    const result = await input.run(taskId)
    patchTask(taskId, {error: undefined, progress: 100, status: 'done'})
    input.success?.(taskId, result)
    return result
  } catch (error) {
    const message = getErrorMessage(error)
    patchTask(taskId, {error: message, status: 'failed'})
    notifySftpFailure({action: `${input.kind}-failed`, taskId, path: input.path, title: input.failureTitle, error, traceId: `task:${taskId}`})
    throw error
  } finally {
    runningOperationKeys.delete(operationKey)
  }
}

export function hasRunningSftpOperation(kind: SftpOperationKind, path: string) {
  return runningOperationKeys.has(createOperationKey(kind, path))
}

function createTask(input: Pick<SftpOperationInput<unknown>, 'kind' | 'path' | 'detail' | 'retryContext' | 'title'>, taskId: string): TaskItem {
  return {
    id: taskId,
    action: input.kind,
    detail: input.detail ?? input.path,
    kind: 'sftp',
    path: input.path,
    progress: 0,
    retryContext: input.retryContext ?? {kind: input.kind, path: input.path},
    status: 'running',
    title: input.title,
    traceId: `task:${taskId}`,
  }
}

function createOperationKey(kind: SftpOperationKind, path: string) {
  return `${kind}:${normalizeRemotePath(path)}`
}

function normalizeRemotePath(path: string) {
  const normalized = path.trim().replace(/\/+$/, '')
  return normalized || '/'
}

export function transferTitle(kind: 'upload' | 'download') {
  return `${capitalize(kind)} file`
}

export function transferFailureTitle(kind: 'upload' | 'download') {
  return messages.sftp.failures.transfer(kind)
}

export function transferSuccessTitle(kind: 'upload' | 'download') {
  return `${capitalize(kind)} completed`
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}
