import type {IpcCommandMap} from './ipcContract'

export class IpcError extends Error {
  constructor(
    readonly command: keyof IpcCommandMap,
    readonly cause: unknown,
  ) {
    super(formatIpcError(command, cause))
    this.name = 'IpcError'
  }
}

export function normalizeIpcError(command: keyof IpcCommandMap, cause: unknown) {
  return cause instanceof IpcError ? cause : new IpcError(command, cause)
}

function formatIpcError(command: keyof IpcCommandMap, cause: unknown) {
  if (cause instanceof Error) return `${command} failed: ${cause.message}`
  return `${command} failed: ${String(cause)}`
}
