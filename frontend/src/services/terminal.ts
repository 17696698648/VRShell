import { listen } from '@tauri-apps/api/event'
import {typedInvoke} from './ipc'

export const TERMINAL_EVENTS = {
  closed: 'terminal-closed',
  data: 'terminal-data',
  error: 'terminal-error',
  info: 'terminal-info',
  ptyResizeAck: 'terminal-pty-resize-ack',
} as const

export type TerminalEventName = typeof TERMINAL_EVENTS[keyof typeof TERMINAL_EVENTS]

export type TerminalEventCallback<T> = (event: { payload: T }) => void
export type TerminalUnlistenFn = () => void

export interface ConnectSshOptions {
  host: string
  port: number
  username: string
  password?: string | null
  privateKeyPath?: string | null
  passphrase?: string | null
  autoReconnect: boolean
  idleTimeoutSecs: number
}

export interface TerminalDataPayload {
  session_id: string
  data_base64: string
}

export function connectSsh(options: ConnectSshOptions) {
  return typedInvoke<string>('connect_ssh', options)
}

export function disconnectSshSession(sessionId: string) {
  return typedInvoke<void>('disconnect_session', { sessionId })
}

export function pollTerminalEvents(sessionId: string) {
  return typedInvoke<string[]>('poll_events', { sessionId })
}

export function resizePty(sessionId: string | null, cols: number, rows: number) {
  return typedInvoke<void>('resize_pty', { sessionId, cols, rows })
}

export function sendTerminalInput(sessionId: string, dataBase64: string) {
  return typedInvoke<void>('send_input', { sessionId, dataBase64 })
}

export function listenTerminalEvent<T>(event: TerminalEventName, callback: TerminalEventCallback<T>): Promise<TerminalUnlistenFn> {
  return listen(event, callback as any)
}
