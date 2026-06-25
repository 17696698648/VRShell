import {reactive} from 'vue'
import {createId} from '../lib/createId'
import {logMessage} from '../lib/logger'

export type FeedbackLevel = 'info' | 'success' | 'warning' | 'error'

export interface ToastMessage {
  id: string
  title: string
  detail?: string
  level: FeedbackLevel
  createdAt: number
  dedupeKey?: string
  timeoutMs?: number | null
}

export interface PushToastInput extends Omit<ToastMessage, 'id' | 'createdAt'> {
  cooldownMs?: number
  timeoutMs?: number
}

export const feedbackState = reactive({
  toasts: [] as ToastMessage[],
})

export function pushToast(input: PushToastInput) {
  const now = Date.now()
  if (input.dedupeKey) {
    const existingToast = feedbackState.toasts.find((toast) => toast.dedupeKey === input.dedupeKey)
    if (existingToast && (!input.cooldownMs || now - existingToast.createdAt < input.cooldownMs)) return existingToast.id
  }
  const toast: ToastMessage = {
    ...input,
    id: createId('toast'),
    createdAt: now,
    timeoutMs: input.timeoutMs ?? getDefaultTimeoutMs(input.level),
  }
  delete (toast as ToastMessage & {cooldownMs?: number}).cooldownMs
  feedbackState.toasts.push(toast)
  scheduleToastRemoval(toast.id, input.timeoutMs ?? getDefaultTimeoutMs(toast.level))
  logMessage({
    detail: toast.detail,
    level: toast.level === 'success' ? 'info' : toast.level,
    message: toast.title,
    source: 'ui',
  })
  return toast.id
}

function scheduleToastRemoval(toastId: string, timeoutMs: number | null) {
  if (!timeoutMs || timeoutMs <= 0 || typeof window === 'undefined') return
  window.setTimeout(() => removeToast(toastId), timeoutMs)
}

function getDefaultTimeoutMs(level: FeedbackLevel) {
  if (level === 'success' || level === 'info') return 3000
  if (level === 'warning') return 5000
  return null
}

export function removeToast(toastId: string) {
  const index = feedbackState.toasts.findIndex((toast) => toast.id === toastId)
  if (index >= 0) feedbackState.toasts.splice(index, 1)
}

export function clearToasts() {
  feedbackState.toasts.splice(0, feedbackState.toasts.length)
}
