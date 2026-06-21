import {invoke as tauriInvoke} from '@tauri-apps/api/core'
import type {ConnectSshArgs, IpcCommandMap, SessionTreeActionPayload} from './ipcContract'
import {normalizeIpcError} from './ipcErrors'

export type {
  BackendSessionGroup,
  BackendSessionHost,
  ConnectSshArgs,
  CredentialRef,
  IpcCommandMap,
  SessionTreeActionName,
  SessionTreeActionPayload,
  SessionTreeActionResult,
  SessionTreeTargetType,
  SftpConnection,
  SftpEntry,
  SftpTransferOptions,
  SshConfigHost,
} from './ipcContract'
export {IpcError} from './ipcErrors'

type InvokeMock = (command: keyof IpcCommandMap, args: unknown) => Promise<unknown>
let customInvokeMock: InvokeMock | null = null

export function setIpcMock(mock: InvokeMock | null) {
  customInvokeMock = mock
}

export async function typedInvoke<K extends keyof IpcCommandMap>(
  command: K,
  ...args: IpcCommandMap[K]['args'] extends undefined ? [] : [IpcCommandMap[K]['args']]
): Promise<IpcCommandMap[K]['result']> {
  try {
    if (!isTauriRuntime()) {
      return await invokeMock(command, args[0]) as IpcCommandMap[K]['result']
    }
    return await tauriInvoke<IpcCommandMap[K]['result']>(command, args[0])
  } catch (error) {
    throw normalizeIpcError(command, error)
  }
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean('__TAURI_INTERNALS__' in window)
}

async function invokeMock(command: keyof IpcCommandMap, args: unknown) {
  if (customInvokeMock) return customInvokeMock(command, args)
  if (command === 'connect_ssh') {
    const payload = args as ConnectSshArgs
    return `mock-${payload.username}-${payload.host}`
  }
  if (command === 'poll_events') return []
  if (command === 'parse_ssh_config') return []
  if (command === 'apply_session_tree_action') {
    const payload = args as SessionTreeActionPayload
    return {
      action: payload.action,
      targetType: payload.targetType,
      targetId: payload.targetId,
      message: `${payload.targetId} ${payload.action}`,
    }
  }
  if (command === 'sftp_list') {
    const payload = args as {path: string}
    return [
      {name: 'logs', path: `${payload.path}/logs`, is_dir: true, size: 0, modified: Date.now()},
      {name: 'app.env', path: `${payload.path}/app.env`, is_dir: false, size: 2048, modified: Date.now()},
    ]
  }
  return undefined
}
