export interface CredentialRef {
  service: string
  key: string
}

export interface HostKeyFingerprint {
  algorithm: string
  value: string
}

export type HostKeyDecision = 'accept-once' | 'trust-and-save' | 'reject'

export interface HostKeyDialogRequest {
  id: string
  host: string
  port: number
  username?: string | null
  reason: 'unknown' | 'changed'
  fingerprint: HostKeyFingerprint
  knownFingerprint?: HostKeyFingerprint | null
  resolve: (decision: HostKeyDecision) => void
}
