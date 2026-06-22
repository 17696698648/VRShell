import {reactive} from 'vue'
import {createId} from '../../../shared/lib/createId'
import type {HostKeyDecision, HostKeyDialogRequest, HostKeyFingerprint} from './security.types'

export interface RequestHostKeyDecisionInput {
  host: string
  port: number
  username?: string | null
  reason: 'unknown' | 'changed'
  fingerprint: HostKeyFingerprint
  knownFingerprint?: HostKeyFingerprint | null
}

export const securityState = reactive({
  hostKeyDialog: null as HostKeyDialogRequest | null,
})

export function requestHostKeyDecision(input: RequestHostKeyDecisionInput) {
  return new Promise<HostKeyDecision>((resolve) => {
    securityState.hostKeyDialog = {
      id: createId('host-key'),
      ...input,
      resolve,
    }
  })
}

export function resolveHostKeyDecision(decision: HostKeyDecision) {
  const request = securityState.hostKeyDialog
  if (!request) return
  securityState.hostKeyDialog = null
  request.resolve(decision)
}

export function clearSecurityDialogs() {
  resolveHostKeyDecision('reject')
}
