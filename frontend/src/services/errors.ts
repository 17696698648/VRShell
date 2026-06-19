export type AppErrorSeverity = 'info' | 'warning' | 'error'
export type AppErrorCategory = 'auth' | 'network' | 'security' | 'permission' | 'filesystem' | 'transfer' | 'canceled' | 'unknown'

export type AppError = {
  code: string
  message: string
  recoverable: boolean
  severity: AppErrorSeverity
  category: AppErrorCategory
  retryable: boolean
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

const categoryByCode: Record<string, AppErrorCategory> = {
  dns_resolve: 'network',
  tcp_connect: 'network',
  handshake: 'network',
  connection: 'network',
  session: 'network',
  auth_failed: 'auth',
  auth_agent: 'auth',
  auth_key: 'auth',
  host_key: 'security',
  host_key_unknown: 'security',
  host_key_mismatch: 'security',
  permission_denied: 'permission',
  not_found: 'filesystem',
  sftp_error: 'filesystem',
  size_mismatch: 'transfer',
  canceled: 'canceled',
}

const retryableCodes = new Set([
  'dns_resolve',
  'tcp_connect',
  'handshake',
  'connection',
  'session',
  'sftp_error',
  'size_mismatch',
])

const sensitivePatterns = [
  /password\s*[:=]\s*[^\s,;]+/gi,
  /passphrase\s*[:=]\s*[^\s,;]+/gi,
  /private[_ -]?key\s*[:=]\s*[^\s,;]+/gi,
  /privateKeyPath\s*[:=]\s*[^\s,;]+/gi,
  /identity[_ -]?file\s*[:=]\s*[^\s,;]+/gi,
  /-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/gi,
  /([A-Z]:)?[\\/](?:Users|home)[\\/][^\\/\s]+/gi,
]

export function redactSensitiveText(value: string) {
  return sensitivePatterns.reduce((text, pattern) => text.replace(pattern, (match) => {
    if (match.toLowerCase().includes('password')) return 'password=<redacted>'
    if (match.toLowerCase().includes('passphrase')) return 'passphrase=<redacted>'
    if (match.toLowerCase().includes('key')) return 'privateKey=<redacted>'
    return '<user-path>'
  }), value)
}

export function toAppError(error: unknown, fallbackMessage = 'Operation failed'): AppError {
  if (error && typeof error === 'object') {
    const value = error as StructuredError
    const code = typeof value.code === 'string' && value.code ? value.code : 'unknown'
    const message = redactSensitiveText(typeof value.message === 'string' && value.message ? value.message : fallbackMessage)
    const recoverable = typeof value.recoverable === 'boolean' ? value.recoverable : false
    const details = value.details && typeof value.details === 'object'
      ? value.details as Record<string, unknown>
      : undefined
    const path = typeof value.path === 'string'
      ? redactSensitiveText(value.path)
      : typeof details?.path === 'string'
        ? redactSensitiveText(details.path)
        : null

    const category = classifyAppError(code)
    return {
      code,
      message,
      recoverable,
      retryable: isRetryableAppError(code, recoverable),
      category,
      path,
      details,
      severity: getAppErrorSeverity(code, category),
      suggestion: suggestions[code],
      raw: error,
    }
  }

  const message = redactSensitiveText(error instanceof Error ? error.message : String(error || fallbackMessage))
  return {
    code: 'unknown',
    message,
    recoverable: false,
    retryable: false,
    category: 'unknown',
    severity: 'error',
    raw: error,
  }
}

export function classifyAppError(code: string): AppErrorCategory {
  return categoryByCode[code] ?? 'unknown'
}

export function isRetryableAppError(code: string, recoverable = false) {
  return recoverable && retryableCodes.has(code)
}

export function getAppErrorSeverity(code: string, category = classifyAppError(code)): AppErrorSeverity {
  if (category === 'canceled') return 'info'
  if (category === 'security' || category === 'permission') return 'warning'
  return 'error'
}

export function summarizeAppError(error: unknown, fallbackMessage = 'Operation failed') {
  const appError = toAppError(error, fallbackMessage)
  const category = appError.category === 'unknown' ? 'error' : appError.category
  const retryHint = appError.retryable ? 'Retry is available.' : appError.suggestion
  return [category, appError.message, retryHint].filter(Boolean).join(' · ')
}

export function formatAppError(error: unknown, fallbackMessage = 'Operation failed') {
  const appError = toAppError(error, fallbackMessage)
  const path = appError.path ? ` (${appError.path})` : ''
  const suggestion = appError.suggestion ? ` ${appError.suggestion}` : ''
  return `${appError.message}${path}${suggestion}`
}
