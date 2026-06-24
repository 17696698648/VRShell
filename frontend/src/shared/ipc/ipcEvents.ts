import {listen} from '@tauri-apps/api/event'

export interface IpcEventMap {
  'terminal-output': TerminalOutputEvent
  'terminal-closed': TerminalSessionEvent
  'terminal-error': TerminalErrorEvent
  'sftp-progress': SftpProgressEvent
  'sftp-completed': SftpProgressEvent
  'sftp-failed': SftpFailedEvent
}

export interface TerminalOutputEvent {
  sessionId: string
  dataBase64: string
}

export interface TerminalSessionEvent {
  sessionId: string
}

export interface TerminalErrorEvent {
  sessionId: string
  error: string
}

export interface SftpProgressEvent {
  taskId: string
  kind?: string
  title?: string
  detail?: string
  transferredBytes: number
  totalBytes?: number | null
  bytesPerSecond?: number | null
}

export interface SftpFailedEvent extends SftpProgressEvent {
  error?: string
}

export async function listenTypedEvent<K extends keyof IpcEventMap>(eventName: K, handler: (payload: IpcEventMap[K]) => void) {
  if (!isTauriRuntime()) return () => {}
  return listen(eventName, (event) => handler(event.payload as IpcEventMap[K]))
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean('__TAURI_INTERNALS__' in window)
}
