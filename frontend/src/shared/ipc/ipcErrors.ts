import type {IpcCommandMap} from './ipcContract'

export class IpcError extends Error {
  readonly code: string | null
  readonly displayMessage: string

  constructor(
    readonly command: keyof IpcCommandMap,
    readonly cause: unknown,
  ) {
    const detail = getIpcErrorDetail(cause)
    super(`${command} failed: ${detail.message}`)
    this.name = 'IpcError'
    this.code = detail.code
    this.displayMessage = detail.message
  }
}

export function normalizeIpcError(command: keyof IpcCommandMap, cause: unknown) {
  return cause instanceof IpcError ? cause : new IpcError(command, cause)
}

export function getIpcErrorDisplayMessage(error: unknown) {
  if (error instanceof IpcError) return error.displayMessage
  return sanitizeErrorMessage(error instanceof Error ? error.message : String(error))
}

function getIpcErrorDetail(cause: unknown) {
  const structured = readStructuredError(cause)
  if (structured?.code === 'notImplemented') return {code: structured.code, message: '功能建设中，当前版本暂不可用'}
  if (structured) return {code: structured.code, message: sanitizeErrorMessage(structured.message)}
  return {code: null, message: sanitizeErrorMessage(cause instanceof Error ? cause.message : String(cause))}
}

function readStructuredError(cause: unknown) {
  if (!cause || typeof cause !== 'object') return null
  const value = cause as {code?: unknown; message?: unknown}
  if (typeof value.code !== 'string' || typeof value.message !== 'string') return null
  return {code: value.code, message: value.message}
}

function sanitizeErrorMessage(message: string) {
  return message
    .replace(/(password|passphrase|secret|token|privateKey|private_key)(\s*[=:]\s*)[^\s,;]+/gi, '$1$2[redacted]')
    .replace(/(-----BEGIN [^-]+-----)[\s\S]*?(-----END [^-]+-----)/g, '$1[redacted]$2')
}
