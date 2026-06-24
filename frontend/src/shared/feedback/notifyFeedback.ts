import {pushToast, type FeedbackLevel} from './feedbackStore'

export interface FeedbackNotification {
  level: FeedbackLevel
  title: string
  detail?: string
  dedupeKey?: string
  cooldownMs?: number
  timeoutMs?: number
}

export function notifyFeedback(notification: FeedbackNotification) {
  return pushToast(notification)
}

export function notifyError(input: Omit<FeedbackNotification, 'level'>) {
  return notifyFeedback({level: 'error', cooldownMs: 5000, ...input})
}

export function notifyWarning(input: Omit<FeedbackNotification, 'level'>) {
  return notifyFeedback({level: 'warning', cooldownMs: 5000, ...input})
}

export function notifyInfo(input: Omit<FeedbackNotification, 'level'>) {
  return notifyFeedback({level: 'info', ...input})
}

export function notifySftpFailure(input: {title: string; detail?: string; path?: string; taskId?: string; action: string}) {
  return notifyError({
    title: input.title,
    detail: input.detail,
    dedupeKey: input.taskId ? `sftp:${input.taskId}:${input.action}` : input.path ? `sftp:${input.path}:${input.action}` : `sftp:${input.action}`,
  })
}

export function notifyTerminalFailure(input: {title: string; detail?: string; terminalId?: string; action: string}) {
  return notifyError({
    title: input.title,
    detail: input.detail,
    dedupeKey: input.terminalId ? `terminal:${input.terminalId}:${input.action}` : `terminal:${input.action}`,
  })
}

export function notifyTaskFailure(input: {title: string; detail?: string; taskId: string; action: string}) {
  return notifyError({
    title: input.title,
    detail: input.detail,
    dedupeKey: `task:${input.taskId}:${input.action}`,
  })
}
