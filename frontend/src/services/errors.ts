export type AppErrorSeverity = 'info' | 'warning' | 'error'

export type AppError = {
  code: string
  message: string
  recoverable: boolean
  severity: AppErrorSeverity
  path?: string | null
  details?: Record<string, unknown>
  suggestion?: string
  raw?: unknown
}

type StructuredError = {
  code?: unknown
  message?: unknown
  recoverable?: unknown
  path?: unknown
  details?: unknown
}

const suggestions: Record<string, string> = {
  dns_resolve: 'Check the host name or DNS/network configuration.',
  tcp_connect: 'Check the host, port, firewall, or VPN connection.',
  handshake: 'Check SSH service availability and protocol compatibility.',
  auth_failed: 'Check the username, password, key, or account permissions.',
  auth_agent: 'Check whether your SSH agent is running and has the right key loaded.',
  auth_key: 'Check the private key path, passphrase, and server authorized_keys configuration.',
  connection: 'Check the SSH/SFTP connection and try again.',
  permission_denied: 'Check remote file permissions or use an account with sufficient privileges.',
  not_found: 'Check whether the remote path still exists.',
  size_mismatch: 'Retry the transfer; the local and remote file sizes did not match.',
  sftp_error: 'Check the remote path, permissions, and connection state.',
  host_key_unknown: 'Verify the fingerprint before trusting this host.',
  host_key_mismatch: 'Do not continue unless you intentionally changed the server host key.',
  canceled: 'The operation was canceled before it completed.',
}

export function toAppError(error: unknown, fallbackMessage = 'Operation failed'): AppError {
  if (error && typeof error === 'object') {
    const value = error as StructuredError
    const code = typeof value.code === 'string' && value.code ? value.code : 'unknown'
    const message = typeof value.message === 'string' && value.message ? value.message : fallbackMessage
    const recoverable = typeof value.recoverable === 'boolean' ? value.recoverable : false
    const details = value.details && typeof value.details === 'object'
      ? value.details as Record<string, unknown>
      : undefined
    const path = typeof value.path === 'string'
      ? value.path
      : typeof details?.path === 'string'
        ? details.path
        : null

    return {
      code,
      message,
      recoverable,
      path,
      details,
      severity: code === 'host_key_mismatch' ? 'warning' : 'error',
      suggestion: suggestions[code],
      raw: error,
    }
  }

  const message = error instanceof Error ? error.message : String(error || fallbackMessage)
  return {
    code: 'unknown',
    message,
    recoverable: false,
    severity: 'error',
    raw: error,
  }
}

export function formatAppError(error: unknown, fallbackMessage = 'Operation failed') {
  const appError = toAppError(error, fallbackMessage)
  const path = appError.path ? ` (${appError.path})` : ''
  const suggestion = appError.suggestion ? ` ${appError.suggestion}` : ''
  return `${appError.message}${path}${suggestion}`
}
