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
  SftpTaskSnapshot,
  SftpTransferOptions,
  SshConfigHost,
} from './ipcContract'
export {IpcError} from './ipcErrors'

type InvokeMock = (command: keyof IpcCommandMap, args: unknown) => Promise<unknown>
let customInvokeMock: InvokeMock | null = null
const mockKeyring = new Map<string, string>()

export function setIpcMock(mock: InvokeMock | null) {
  customInvokeMock = mock
}

export async function typedInvoke<K extends keyof IpcCommandMap>(
  command: K,
  ...args: IpcCommandMap[K]['args'] extends undefined ? [] : [IpcCommandMap[K]['args']]
): Promise<IpcCommandMap[K]['result']> {
  try {
    if (!isTauriRuntime()) {
      if (customInvokeMock || isDefaultIpcMockEnabled()) return await invokeMock(command, args[0]) as IpcCommandMap[K]['result']
      throw new Error(`IPC command ${command} requires the Tauri runtime. Set VITE_ENABLE_IPC_MOCKS=true to use browser-only development mocks.`)
    }
    return await tauriInvoke<IpcCommandMap[K]['result']>(command, args[0])
  } catch (error) {
    throw normalizeIpcError(command, error)
  }
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean('__TAURI_INTERNALS__' in window)
}

function isDefaultIpcMockEnabled() {
  return import.meta.env.MODE === 'test' || import.meta.env.VITE_ENABLE_IPC_MOCKS === 'true'
}

async function invokeMock(command: keyof IpcCommandMap, args: unknown) {
  if (customInvokeMock) return customInvokeMock(command, args)
  if (command === 'connect_ssh') {
    const payload = args as ConnectSshArgs
    return `mock-${payload.username}-${payload.host}`
  }
  if (command === 'load_session_tree') return []
  if (command === 'poll_events') return []
  if (command === 'send_input') return undefined
  if (command === 'resize_pty') return undefined
  if (command === 'keyring_store') {
    const payload = args as {service: string; key: string; value: string}
    mockKeyring.set(`${payload.service}:${payload.key}`, payload.value)
    return undefined
  }
  if (command === 'keyring_get') {
    const payload = args as {service: string; key: string}
    return mockKeyring.get(`${payload.service}:${payload.key}`) ?? null
  }
  if (command === 'keyring_delete') {
    const payload = args as {service: string; key: string}
    mockKeyring.delete(`${payload.service}:${payload.key}`)
    return undefined
  }
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
  if (command === 'list_sftp_tasks' || command === 'list_background_tasks') return []
  if (command === 'cancel_background_task') return undefined
  if (command === 'accept_host_key') return 'mock-session-id'
  if (command === 'reject_host_key') return undefined
  if (command === 'test_ssh_connection') {
    const payload = args as {host: string; port: number; username: string}
    return `SSH connection to ${payload.host}:${payload.port} succeeded (mock)`
  }
  if (command === 'tcp_latency') return 42
  return undefined
}
