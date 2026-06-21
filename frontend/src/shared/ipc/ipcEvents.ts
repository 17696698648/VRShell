import {listen} from '@tauri-apps/api/event'

export interface IpcEventMap {
  'sftp.progress': SftpProgressEvent
  'sftp.completed': SftpProgressEvent
  'sftp.failed': SftpProgressEvent & {error?: string}
}

export interface SftpProgressEvent {
  taskId: string
  transferredBytes: number
  totalBytes?: number | null
  bytesPerSecond?: number | null
}

export async function listenTypedEvent<K extends keyof IpcEventMap>(eventName: K, handler: (payload: IpcEventMap[K]) => void) {
  if (!isTauriRuntime()) return () => {}
  return listen(eventName, (event) => handler(event.payload as IpcEventMap[K]))
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean('__TAURI_INTERNALS__' in window)
}
