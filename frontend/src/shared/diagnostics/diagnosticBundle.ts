import {logState} from '../lib/logger'

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
  title: string
  detail: string
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
    title: string
    detail: string
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
      title: sanitizeDiagnosticText(task.title),
      detail: sanitizeDiagnosticText(task.detail),
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
  return value
    .replace(/(password|passphrase|secret|token|privateKey|private_key|access_token|refresh_token)(\s*[=:]\s*)[^\s,;&]+/gi, '$1$2[redacted]')
    .replace(/(password|passphrase|secret|token|access_token|refresh_token)=([^\s,;&]+)/gi, '$1=[redacted]')
    .replace(/(-----BEGIN [^-]+-----)[\s\S]*?(-----END [^-]+-----)/g, '$1[redacted]$2')
}
