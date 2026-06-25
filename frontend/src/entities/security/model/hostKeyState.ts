import {reactive} from 'vue'
import type {HostKeyRequestedEvent} from '../../../shared/ipc/ipcContract'

export interface HostKeyPendingRequest extends HostKeyRequestedEvent {
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
      ...event,
      authArgs,
      resolve: (accepted: boolean) => {
        hostKeyState.pendingRequest = null
        resolve(accepted)
      },
    }
  })
}

export function acceptHostKeyRequest() {
  hostKeyState.pendingRequest?.resolve?.(true)
}

export function rejectHostKeyRequest() {
  hostKeyState.pendingRequest?.resolve?.(false)
}
