import {reactive} from 'vue'
import type {HostKeyRequestedEvent} from '../../../shared/ipc/ipcContract'

export interface HostKeyPendingRequest extends HostKeyRequestedEvent {
  /** Whether the request is currently being accepted or rejected. */
  submitting?: boolean
  /** Error from the last accept/reject attempt. */
  error?: string | null
  /** Auth parameters needed for completing the connection */
  authArgs?: {
    password?: string | null
    privateKeyPath?: string | null
    passphrase?: string | null
    authMethod?: 'agent' | 'password' | 'key'
    credentialRef?: {service: string; key: string} | null
  }
  /** Callback to resolve the dialog */
  resolve?: (accepted: boolean) => void
}

export const hostKeyState = reactive<{
  pendingRequest: HostKeyPendingRequest | null
}>({
  pendingRequest: null,
})

export function requestHostKeyConfirmation(event: HostKeyRequestedEvent, authArgs?: HostKeyPendingRequest['authArgs']): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    hostKeyState.pendingRequest = {
      reason: 'unknown',
      ...event,
      authArgs,
      resolve: (accepted: boolean) => {
        hostKeyState.pendingRequest = null
        resolve(accepted)
      },
    }
  })
}

export function setHostKeyRequestSubmitting(submitting: boolean) {
  if (hostKeyState.pendingRequest) hostKeyState.pendingRequest.submitting = submitting
}

export function setHostKeyRequestError(error: string | null) {
  if (hostKeyState.pendingRequest) hostKeyState.pendingRequest.error = error
}

export function acceptHostKeyRequest() {
  hostKeyState.pendingRequest?.resolve?.(true)
}

export function rejectHostKeyRequest() {
  hostKeyState.pendingRequest?.resolve?.(false)
}
