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
}

export const feedbackState = reactive({
  toasts: [] as ToastMessage[],
})

export function pushToast(input: Omit<ToastMessage, 'id' | 'createdAt'>) {
  const toast: ToastMessage = {
    ...input,
    id: createId('toast'),
    createdAt: Date.now(),
  }
  feedbackState.toasts.push(toast)
  logMessage({
    detail: toast.detail,
    level: toast.level === 'success' ? 'info' : toast.level,
    message: toast.title,
    source: 'ui',
  })
  return toast.id
}

export function removeToast(toastId: string) {
  const index = feedbackState.toasts.findIndex((toast) => toast.id === toastId)
  if (index >= 0) feedbackState.toasts.splice(index, 1)
}

export function clearToasts() {
  feedbackState.toasts.splice(0, feedbackState.toasts.length)
}
