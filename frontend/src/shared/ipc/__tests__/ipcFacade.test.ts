import {describe, expect, it, vi, beforeEach} from 'vitest'
import {sessionApi, terminalApi, sftpFileApi, sftpTaskApi, taskApi, credentialApi, securityApi} from '../ipcFacade'
import {setIpcMock} from '../ipcClient'

const invokeLog: Array<{command: string; args: unknown}> = []

beforeEach(() => {
  invokeLog.length = 0
  setIpcMock(async (command, args) => {
    invokeLog.push({command: command as string, args})
    if (command === 'load_session_tree') return []
    if (command === 'parse_ssh_config') return []
    if (command === 'connect_ssh') return 'mock-session-id'
    if (command === 'list_sftp_tasks') return []
    return undefined
  })
})

describe('sessionApi', () => {
  it('loadTree maps to load_session_tree', async () => {
    await sessionApi.loadTree()
    expect(invokeLog[0].command).toBe('load_session_tree')
  })

  it('saveTree maps to save_session_tree', async () => {
    const tree = [{id: 'all', name: 'All', icon: 'server'}]
    await sessionApi.saveTree(tree as never)
    expect(invokeLog[0].command).toBe('save_session_tree')
    expect((invokeLog[0].args as {sessionTree: unknown}).sessionTree).toEqual(tree)
  })

  it('applyTreeAction maps to apply_session_tree_action', async () => {
    const payload = {action: 'create' as const, targetType: 'host' as const, targetId: 'host-1'}
    await sessionApi.applyTreeAction(payload)
    expect(invokeLog[0].command).toBe('apply_session_tree_action')
    expect(invokeLog[0].args).toEqual(payload)
  })

  it('importSshConfig maps to parse_ssh_config', async () => {
    await sessionApi.importSshConfig()
    expect(invokeLog[0].command).toBe('parse_ssh_config')
  })
})

describe('terminalApi', () => {
  it('open maps to connect_ssh', async () => {
    const request = {
      host: 'example.com',
      port: 22,
      username: 'alice',
      authMethod: 'agent' as const,
      autoReconnect: true,
      idleTimeoutSecs: 0,
    }
    const sessionId = await terminalApi.open(request)
    expect(sessionId).toBe('mock-session-id')
    expect(invokeLog[0].command).toBe('connect_ssh')
  })

  it('write maps to send_input', async () => {
    await terminalApi.write('session-1', 'aGVsbG8=')
    expect(invokeLog[0].command).toBe('send_input')
    expect(invokeLog[0].args).toEqual({sessionId: 'session-1', dataBase64: 'aGVsbG8='})
  })

  it('resize maps to resize_pty', async () => {
    await terminalApi.resize('session-1', 120, 40)
    expect(invokeLog[0].command).toBe('resize_pty')
    expect(invokeLog[0].args).toEqual({sessionId: 'session-1', cols: 120, rows: 40})
  })

  it('close maps to disconnect_session', async () => {
    await terminalApi.close('session-1')
    expect(invokeLog[0].command).toBe('disconnect_session')
    expect(invokeLog[0].args).toEqual({sessionId: 'session-1'})
  })

  it('pollEvents maps to poll_events', async () => {
    await terminalApi.pollEvents('session-1')
    expect(invokeLog[0].command).toBe('poll_events')
  })
})

describe('sftpFileApi', () => {
  const connection = {host: 'example.com', port: 22, username: 'alice'}

  it('list maps to sftp_list', async () => {
    await sftpFileApi.list(connection as never, '/home')
    expect(invokeLog[0].command).toBe('sftp_list')
  })

  it('mkdir maps to sftp_mkdir', async () => {
    await sftpFileApi.mkdir(connection as never, '/home/new')
    expect(invokeLog[0].command).toBe('sftp_mkdir')
  })

  it('remove maps to sftp_delete', async () => {
    await sftpFileApi.remove(connection as never, '/home/old', false)
    expect(invokeLog[0].command).toBe('sftp_delete')
  })
})

describe('sftpTaskApi', () => {
  it('list maps to list_sftp_tasks', async () => {
    await sftpTaskApi.list()
    expect(invokeLog[0].command).toBe('list_sftp_tasks')
  })

  it('cancel maps to cancel_sftp_task', async () => {
    await sftpTaskApi.cancel('task-1')
    expect(invokeLog[0].command).toBe('cancel_sftp_task')
    expect(invokeLog[0].args).toEqual({taskId: 'task-1'})
  })
})

describe('taskApi', () => {
  it('list aggregates SFTP tasks', async () => {
    await taskApi.list()
    expect(invokeLog[0].command).toBe('list_sftp_tasks')
  })

  it('cancel delegates to SFTP task cancellation', async () => {
    await taskApi.cancel('task-1')
    expect(invokeLog[0].command).toBe('cancel_sftp_task')
    expect(invokeLog[0].args).toEqual({taskId: 'task-1'})
  })

  it('retry reports unsupported backend capability', async () => {
    await expect(taskApi.retry('task-1')).rejects.toThrow('task retry is not supported yet')
    expect(invokeLog).toHaveLength(0)
  })
})


describe('securityApi', () => {
  it('acceptHostKey maps to accept_host_key with auth payload', async () => {
    const payload = {
      pendingId: 'pending-1',
      password: 'secret',
      authMethod: 'password' as const,
      credentialRef: {service: 'vrshell', key: 'session:prod:password'},
    }

    await securityApi.acceptHostKey(payload)

    expect(invokeLog[0].command).toBe('accept_host_key')
    expect(invokeLog[0].args).toEqual(payload)
  })

  it('rejectHostKey maps to reject_host_key', async () => {
    await securityApi.rejectHostKey('pending-1')

    expect(invokeLog[0].command).toBe('reject_host_key')
    expect(invokeLog[0].args).toEqual({pendingId: 'pending-1'})
  })

  it('knownHostsPath maps to known_hosts_path', async () => {
    await securityApi.knownHostsPath()
    expect(invokeLog[0].command).toBe('known_hosts_path')
  })

  it('openKnownHosts maps to open_known_hosts', async () => {
    await securityApi.openKnownHosts()
    expect(invokeLog[0].command).toBe('open_known_hosts')
  })
})

describe('credentialApi', () => {
  it('save maps to keyring_store', async () => {
    await credentialApi.save('vrshell', 'session:abc:password', 'secret')
    expect(invokeLog[0].command).toBe('keyring_store')
    expect(invokeLog[0].args).toEqual({service: 'vrshell', key: 'session:abc:password', value: 'secret'})
  })

  it('get maps to keyring_get', async () => {
    await credentialApi.get('vrshell', 'session:abc:password')
    expect(invokeLog[0].command).toBe('keyring_get')
    expect(invokeLog[0].args).toEqual({service: 'vrshell', key: 'session:abc:password'})
  })

  it('delete maps to keyring_delete', async () => {
    await credentialApi.delete('vrshell', 'session:abc:password')
    expect(invokeLog[0].command).toBe('keyring_delete')
    expect(invokeLog[0].args).toEqual({service: 'vrshell', key: 'session:abc:password'})
  })
})
