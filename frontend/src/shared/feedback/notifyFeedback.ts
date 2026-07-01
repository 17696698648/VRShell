import {normalizeError, type AppError, type AppErrorSeverity, type AppErrorSource} from '../lib/appError'
import {pushToast, type FeedbackLevel} from './feedbackStore'

export interface FeedbackNotification {
  level: FeedbackLevel
  title: string
  detail?: string
  dedupeKey?: string
  cooldownMs?: number
  recoverable?: boolean
  severity?: AppErrorSeverity
  source?: AppErrorSource
  timeoutMs?: number | null
}

export interface AppErrorNotificationInput {
  title: string
  action?: string
  dedupeKey?: string
  detail?: string
  cooldownMs?: number
  timeoutMs?: number | null
  traceId?: string
}

type FailureNotificationInput = AppErrorNotificationInput & {
  error?: unknown
  path?: string
  taskId?: string
  terminalId?: string
  traceId?: string
}

export function notifyFeedback(notification: FeedbackNotification) {
  return pushToast(notification)
}

export function notifyError(input: Omit<FeedbackNotification, 'level'>) {
  return notifyFeedback({level: 'error', cooldownMs: 5000, ...input})
}

export function notifyAppError(error: unknown, input: AppErrorNotificationInput) {
  const appError = normalizeError(error)
  return notifyFeedback({
    level: feedbackLevelForSeverity(appError.severity),
    title: input.title,
    detail: withTraceId(input.detail ?? displayMessageForError(error, appError), input.traceId),
    dedupeKey: input.dedupeKey ?? `${appError.source}:${appError.code}:${input.action ?? input.title}`,
    cooldownMs: input.cooldownMs ?? 5000,
    recoverable: appError.recoverable,
    severity: appError.severity,
    source: appError.source,
    timeoutMs: input.timeoutMs ?? (appError.recoverable ? undefined : null),
  })
}

export function notifyWarning(input: Omit<FeedbackNotification, 'level'>) {
  return notifyFeedback({level: 'warning', cooldownMs: 5000, ...input})
}

export function notifyInfo(input: Omit<FeedbackNotification, 'level'>) {
  return notifyFeedback({level: 'info', ...input})
}

export function notifySftpFailure(input: FailureNotificationInput) {
  const dedupeKey = input.taskId ? `sftp:${input.taskId}:${input.action}` : input.path ? `sftp:${input.path}:${input.action}` : `sftp:${input.action}`
  return notifyFailure(input, dedupeKey)
}

export function notifyTerminalFailure(input: FailureNotificationInput) {
  const dedupeKey = input.terminalId ? `terminal:${input.terminalId}:${input.action}` : `terminal:${input.action}`
  return notifyFailure(input, dedupeKey)
}

export function notifyTaskFailure(input: FailureNotificationInput & {taskId: string}) {
  return notifyFailure(input, `task:${input.taskId}:${input.action}`)
}

function notifyFailure(input: FailureNotificationInput, dedupeKey: string) {
  if (input.error !== undefined) return notifyAppError(input.error, {...input, dedupeKey})
  return notifyError({title: input.title, detail: withTraceId(input.detail, input.traceId), dedupeKey})
}

function withTraceId(detail: string | undefined, traceId: string | undefined) {
  if (!traceId) return detail
  return detail ? `${detail}\nTrace ID: ${traceId}` : `Trace ID: ${traceId}`
}

function feedbackLevelForSeverity(severity: AppErrorSeverity): FeedbackLevel {
  if (severity === 'info') return 'info'
  if (severity === 'warning') return 'warning'
  return 'error'
}

function displayMessageForError(error: unknown, appError: AppError) {
  if (error && typeof error === 'object' && 'displayMessage' in error) {
    const displayMessage = (error as {displayMessage?: unknown}).displayMessage
    if (typeof displayMessage === 'string') return displayMessage
  }
  return appError.message
}
