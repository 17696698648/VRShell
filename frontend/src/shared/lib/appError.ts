export type AppErrorSeverity = 'info' | 'warning' | 'error' | 'fatal'
export type AppErrorSource = 'ipc' | 'ssh' | 'sftp' | 'terminal' | 'ui' | 'unknown'

export interface AppError {
  code: string
  message: string
  detail?: string
  cause?: unknown
  severity: AppErrorSeverity
  recoverable: boolean
  source: AppErrorSource
}

export function normalizeError(error: unknown, fallback: Partial<AppError> = {}): AppError {
  if (isAppError(error)) return error
  const message = error instanceof Error ? error.message : String(error)
  return {
    code: fallback.code ?? 'unknown.error',
    detail: fallback.detail,
    cause: error,
    message,
    recoverable: fallback.recoverable ?? true,
    severity: fallback.severity ?? 'error',
    source: fallback.source ?? 'unknown',
  }
}

export function isAppError(error: unknown): error is AppError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error && 'severity' in error && 'source' in error
}
