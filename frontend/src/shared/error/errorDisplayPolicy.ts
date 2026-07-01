import type {AppError, AppErrorSeverity, AppErrorSource} from '../lib/appError'

export type ErrorDisplayKind = 'invalid-input' | 'authentication' | 'unknown-host-key' | 'host-key-changed' | 'network' | 'retryable-backend' | 'backend'

export interface ErrorDisplayPolicy {
  kind: ErrorDisplayKind
  message: string
  action: string
  severity: AppErrorSeverity
  recoverable: boolean
  source: AppErrorSource
}

const policiesByCode: Record<string, ErrorDisplayPolicy> = {
  hostKeyUnknown: {
    kind: 'unknown-host-key',
    message: 'Unknown SSH host key.',
    action: 'Verify the fingerprint in the host-key dialog before trusting this server.',
    severity: 'warning',
    recoverable: true,
    source: 'ssh',
  },
  hostKeyChanged: {
    kind: 'host-key-changed',
    message: 'SSH host key changed.',
    action: 'Do not connect until you confirm the server identity with an administrator.',
    severity: 'fatal',
    recoverable: false,
    source: 'ssh',
  },
  validationError: {
    kind: 'invalid-input',
    message: 'Connection details are incomplete or invalid.',
    action: 'Check the host, port, username, and selected authentication method.',
    severity: 'warning',
    recoverable: true,
    source: 'ssh',
  },
  authenticationError: {
    kind: 'authentication',
    message: 'SSH authentication failed.',
    action: 'Check the password, private key, passphrase, SSH agent, or saved credential and try again.',
    severity: 'warning',
    recoverable: true,
    source: 'ssh',
  },
  credentialError: {
    kind: 'authentication',
    message: 'SSH authentication failed.',
    action: 'Check the password, private key, passphrase, SSH agent, or saved credential and try again.',
    severity: 'warning',
    recoverable: true,
    source: 'ssh',
  },
  networkError: {
    kind: 'network',
    message: 'Network connection failed.',
    action: 'Check DNS, VPN, firewall, port, and server reachability before retrying.',
    severity: 'error',
    recoverable: true,
    source: 'ssh',
  },
}

export function getErrorDisplayPolicy(error: AppError): ErrorDisplayPolicy {
  const policy = policiesByCode[error.code]
  if (policy) return policy
  if (error.recoverable) {
    return {
      kind: 'retryable-backend',
      message: 'Connection failed but can be retried.',
      action: 'Review the details, then retry the connection when the backend is ready.',
      severity: error.severity,
      recoverable: true,
      source: error.source === 'unknown' ? 'ssh' : error.source,
    }
  }
  return {
    kind: 'backend',
    message: 'Connection failed.',
    action: 'Review the details before trying again.',
    severity: error.severity,
    recoverable: error.recoverable,
    source: error.source === 'unknown' ? 'ssh' : error.source,
  }
}
