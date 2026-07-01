import type {IpcCommandMap} from './ipcContract'
import type {AppError, AppErrorSeverity, AppErrorSource} from '../lib/appError'
import {sanitizeSensitiveText} from '../lib/sanitizeSensitiveText'

type BackendErrorKind = 'validation' | 'network' | 'authentication' | 'sftp' | 'terminal' | 'cancelled' | 'storage' | 'credential' | 'security'

interface IpcErrorDetail {
  code: string
  kind: BackendErrorKind | 'ipc' | 'unknown'
  message: string
  recoverable: boolean
}

export class IpcError extends Error implements AppError {
  readonly code: string
  readonly detail: string
  readonly displayMessage: string
  readonly recoverable: boolean
  readonly severity: AppErrorSeverity
  readonly source: AppErrorSource

  constructor(
    readonly command: keyof IpcCommandMap,
    readonly cause: unknown,
  ) {
    const detail = getIpcErrorDetail(cause)
    super(`${command} failed: ${detail.message}`)
    this.name = 'IpcError'
    this.code = detail.code
    this.detail = `${command} failed`
    this.displayMessage = detail.message
    this.recoverable = detail.recoverable
    this.severity = severityForIpcError(detail)
    this.source = sourceForIpcError(command, detail)
  }
}

export function normalizeIpcError(command: keyof IpcCommandMap, cause: unknown) {
  return cause instanceof IpcError ? cause : new IpcError(command, cause)
}

export function getIpcErrorDisplayMessage(error: unknown) {
  if (error instanceof IpcError) return error.displayMessage
  return sanitizeErrorMessage(error instanceof Error ? error.message : String(error))
}

function getIpcErrorDetail(cause: unknown): IpcErrorDetail {
  const structured = readStructuredError(cause)
  if (structured?.code === 'notImplemented') {
    return {code: structured.code, kind: 'ipc', message: '功能建设中，当前版本暂不可用', recoverable: true}
  }
  if (structured) {
    return {
      code: structured.code,
      kind: structured.kind,
      message: sanitizeErrorMessage(structured.message),
      recoverable: structured.recoverable,
    }
  }
  return {
    code: 'ipcError',
    kind: 'ipc',
    message: sanitizeErrorMessage(cause instanceof Error ? cause.message : String(cause)),
    recoverable: true,
  }
}

function readStructuredError(cause: unknown): IpcErrorDetail | null {
  if (!cause || typeof cause !== 'object') return null
  const value = cause as {code?: unknown; kind?: unknown; message?: unknown; recoverable?: unknown}
  if (typeof value.code !== 'string' || typeof value.message !== 'string') return null
  return {
    code: value.code,
    kind: isBackendErrorKind(value.kind) ? value.kind : 'unknown',
    message: value.message,
    recoverable: typeof value.recoverable === 'boolean' ? value.recoverable : true,
  }
}

function isBackendErrorKind(kind: unknown): kind is BackendErrorKind {
  return typeof kind === 'string' && ['validation', 'network', 'authentication', 'sftp', 'terminal', 'cancelled', 'storage', 'credential', 'security'].includes(kind)
}

function severityForIpcError(error: IpcErrorDetail): AppErrorSeverity {
  if (!error.recoverable) return 'fatal'
  if (error.kind === 'validation' || error.kind === 'cancelled') return 'warning'
  return 'error'
}

function sourceForIpcError(command: keyof IpcCommandMap, error: IpcErrorDetail): AppErrorSource {
  if (error.kind === 'sftp') return 'sftp'
  if (error.kind === 'terminal') return 'terminal'
  if (error.kind === 'network' || error.kind === 'authentication' || error.kind === 'security') return 'ssh'
  if (command.toString().startsWith('sftp_') || command === 'list_sftp_tasks' || command === 'list_background_tasks' || command === 'cancel_sftp_task' || command === 'cancel_background_task') return 'sftp'
  if (['connect_ssh', 'send_input', 'resize_pty', 'poll_events', 'disconnect_session'].includes(command.toString())) return 'terminal'
  return 'ipc'
}

function sanitizeErrorMessage(message: string) {
  return sanitizeSensitiveText(message)
}
