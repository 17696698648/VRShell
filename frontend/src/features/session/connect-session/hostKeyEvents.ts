import {requestHostKeyConfirmation} from '../../../entities/security/model/hostKeyState'
import type {HostKeyRequestedEvent} from '../../../shared/ipc/ipcContract'

export function handleHostKeyRequested(event: HostKeyRequestedEvent) {
  return requestHostKeyConfirmation(event)
}
