import {describe, expect, it} from 'vitest'
import {ipcCommandNames, type IpcCommandMap} from '../ipcContract'

const backendCommandNames = [
  'open_devtools',
  'load_session_tree',
  'save_session_tree',
  'session_tree_action',
  'apply_session_tree_action',
  'parse_ssh_config',
  'connect_ssh',
  'send_input',
  'disconnect_session',
  'resize_pty',
  'poll_events',
  'test_ssh_connection',
  'tcp_latency',
  'sftp_list',
  'sftp_mkdir',
  'sftp_rename',
  'sftp_delete',
  'sftp_upload',
  'sftp_download',
  'cancel_sftp_task',
  'keyring_store',
  'keyring_get',
  'keyring_delete',
] as const satisfies readonly (keyof IpcCommandMap)[]

describe('ipc contract', () => {
  it('keeps frontend command map aligned with backend command names', () => {
    expect([...ipcCommandNames].sort()).toEqual([...backendCommandNames].sort())
  })

  it('does not contain duplicate command names', () => {
    expect(new Set(ipcCommandNames).size).toBe(ipcCommandNames.length)
  })
})
