import {reactive} from 'vue'
import {createId} from './createId'
import {normalizeError, type AppError, type AppErrorSeverity, type AppErrorSource} from './appError'

export interface LogEntry {
  id: string
  timestamp: number
  level: AppErrorSeverity
  source: AppErrorSource
  message: string
  detail?: string
  error?: AppError
}

export const logState = reactive({
  entries: [] as LogEntry[],
})

export function logMessage(input: Omit<LogEntry, 'id' | 'timestamp'>) {
  const entry: LogEntry = {
    ...input,
    id: createId('log'),
    timestamp: Date.now(),
  }
  logState.entries.unshift(entry)
  logState.entries.splice(200)
  return entry
}

export function logError(error: unknown, fallback: Partial<AppError> = {}) {
  const appError = normalizeError(error, fallback)
  return logMessage({
    detail: appError.detail,
    error: appError,
    level: appError.severity,
    message: appError.message,
    source: appError.source,
  })
}

export function clearLogs() {
  logState.entries.splice(0, logState.entries.length)
}
