import {logState} from '../lib/logger'
import {sanitizeSensitiveText} from '../lib/sanitizeSensitiveText'

export interface DiagnosticSessionInput {
  id: string
  name: string
  host: string
  port: number
  username: string
  protocol: string
  status: string
  auth?: {type?: string}
  backendSessionId?: string
}

export interface DiagnosticTaskInput {
  id: string
  action?: string
  title: string
  detail: string
  path?: string
  status: string
  progress: number
  traceId?: string
  error?: string
}

export interface DiagnosticBundleInput {
  sessions?: DiagnosticSessionInput[]
  tasks?: DiagnosticTaskInput[]
}

export interface DiagnosticBundle {
  generatedAt: string
  environment: {
    userAgent: string
    tauri: boolean
  }
  summary: {
    sessionCount: number
    taskCount: number
    failedTaskCount: number
    connectedSessionCount: number
  }
  sessions: Array<{
    id: string
    name: string
    host: string
    port: number
    username: string
    protocol: string
    status: string
    authType?: string
    backendSessionId?: string
  }>
  tasks: Array<{
    id: string
    action?: string
    title: string
    detail: string
    path?: string
    status: string
    progress: number
    traceId?: string
    error?: string
  }>
  logs: Array<{
    timestamp: number
    level: string
    source: string
    message: string
    detail?: string
  }>
}

export function createDiagnosticBundle(input: DiagnosticBundleInput = {}): DiagnosticBundle {
  const sessions = input.sessions ?? []
  const tasks = input.tasks ?? []

  return {
    generatedAt: new Date().toISOString(),
    environment: {
      userAgent: sanitizeDiagnosticText(typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent),
      tauri: typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window,
    },
    summary: {
      sessionCount: sessions.length,
      taskCount: tasks.length,
      failedTaskCount: tasks.filter((task) => task.status === 'failed').length,
      connectedSessionCount: sessions.filter((session) => session.status === 'connected').length,
    },
    sessions: sessions.map((session) => ({
      id: session.id,
      name: sanitizeDiagnosticText(session.name),
      host: sanitizeDiagnosticText(session.host),
      port: session.port,
      username: sanitizeDiagnosticText(session.username),
      protocol: session.protocol,
      status: session.status,
      authType: session.auth?.type,
      backendSessionId: session.backendSessionId,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      action: task.action,
      title: sanitizeDiagnosticText(task.title),
      detail: sanitizeDiagnosticText(task.detail),
      path: task.path ? sanitizeDiagnosticText(task.path) : undefined,
      status: task.status,
      progress: task.progress,
      traceId: task.traceId,
      error: task.error ? sanitizeDiagnosticText(task.error) : undefined,
    })),
    logs: logState.entries.map((entry) => ({
      timestamp: entry.timestamp,
      level: entry.level,
      source: entry.source,
      message: sanitizeDiagnosticText(entry.message),
      detail: entry.detail ? sanitizeDiagnosticText(entry.detail) : undefined,
    })),
  }
}

export function exportDiagnosticBundle(input: DiagnosticBundleInput = {}) {
  return JSON.stringify(createDiagnosticBundle(input), null, 2)
}

export function sanitizeDiagnosticText(value: string) {
  return sanitizeSensitiveText(value)
}
