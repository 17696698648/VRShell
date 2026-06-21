import {reactive} from 'vue'
import {createId} from '../lib/createId'

export interface ConfirmDialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

export interface PromptDialogOptions {
  title: string
  label: string
  value?: string
  confirmLabel?: string
  cancelLabel?: string
}

interface ConfirmDialogRequest extends Required<Omit<ConfirmDialogOptions, 'tone'>> {
  id: string
  tone: 'default' | 'danger'
  resolve: (confirmed: boolean) => void
}

interface PromptDialogRequest extends Required<PromptDialogOptions> {
  id: string
  resolve: (value: string | null) => void
}

export const dialogState = reactive({
  confirm: null as ConfirmDialogRequest | null,
  prompt: null as PromptDialogRequest | null,
})

export function requestConfirm(options: ConfirmDialogOptions) {
  return new Promise<boolean>((resolve) => {
    dialogState.confirm = {
      id: createId('dialog'),
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      tone: options.tone ?? 'default',
      resolve,
    }
  })
}

export function requestPrompt(options: PromptDialogOptions) {
  return new Promise<string | null>((resolve) => {
    dialogState.prompt = {
      id: createId('dialog'),
      title: options.title,
      label: options.label,
      value: options.value ?? '',
      confirmLabel: options.confirmLabel ?? 'Save',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      resolve,
    }
  })
}

export function resolveConfirm(confirmed: boolean) {
  const request = dialogState.confirm
  if (!request) return
  dialogState.confirm = null
  request.resolve(confirmed)
}

export function resolvePrompt(value: string | null) {
  const request = dialogState.prompt
  if (!request) return
  dialogState.prompt = null
  request.resolve(value)
}

export function clearDialogs() {
  if (dialogState.confirm) resolveConfirm(false)
  if (dialogState.prompt) resolvePrompt(null)
}
