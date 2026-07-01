import {getErrorDisplayPolicy, type ErrorDisplayKind} from '../../../shared/error/errorDisplayPolicy'
import type {AppError} from '../../../shared/lib/appError'
import {normalizeError} from '../../../shared/lib/appError'
import {sanitizeSensitiveText} from '../../../shared/lib/sanitizeSensitiveText'

export interface ConnectionFailure extends AppError {
  kind: ErrorDisplayKind
  action: string
}

export function normalizeConnectionFailure(error: unknown): ConnectionFailure {
  const appError = normalizeError(error, {source: 'ssh'})
  const policy = getErrorDisplayPolicy(appError)
  const message = sanitizeSensitiveText(displayMessageForError(error, appError))
  return {
    ...appError,
    code: appError.code,
    message: policy.message,
    detail: `${message}\n${policy.action}`,
    severity: policy.severity,
    recoverable: policy.recoverable,
    source: policy.source,
    kind: policy.kind,
    action: policy.action,
    cause: error,
  }
}

export function connectionFailureSummary(error: unknown) {
  const failure = normalizeConnectionFailure(error)
  return `${failure.message} ${failure.action}`
}

function displayMessageForError(error: unknown, appError: AppError) {
  if (error && typeof error === 'object' && 'displayMessage' in error) {
    const displayMessage = (error as {displayMessage?: unknown}).displayMessage
    if (typeof displayMessage === 'string') return displayMessage
  }
  return appError.message
}
