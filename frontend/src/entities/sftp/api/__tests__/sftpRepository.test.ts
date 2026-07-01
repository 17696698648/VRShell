import {afterEach, describe, expect, it} from 'vitest'
import type {SessionHost} from '../../../session'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {listRemoteDirectoryPage, readRemoteFile} from '../sftpRepository'

const session: SessionHost = {
  id: 'session-1',
  name: 'Session 1',
  host: 'example.com',
  port: 22,
  username: 'alice',
  protocol: 'ssh',
  groupId: 'all',
  tags: [],
  status: 'connected',
  backendSessionId: 'backend-1',
}

const passwordSession: SessionHost = {
  ...session,
  id: 'session-password',
  auth: {
    type: 'password',
    password: 'secret',
    credentialRef: {service: 'vrshell', key: 'session:password'},
  },
}

describe('sftpRepository paging', () => {
  afterEach(() => {
    setIpcMock(null)
  })

  it('returns next cursor when received page is full', async () => {
    setIpcMock(async (command, args) => {
      if (command !== 'sftp_list') return undefined
      const payload = args as {path: string}
      return [
        {name: 'a.log', path: `${payload.path}/a.log`, isDirectory: false, size: 1, modified: 0},
        {name: 'b.log', path: `${payload.path}/b.log`, isDirectory: false, size: 1, modified: 0},
      ]
    })

    const page = await listRemoteDirectoryPage(session, '/var/log', {offset: 0, limit: 2})

    expect(page.items).toHaveLength(2)
    expect(page.nextCursor).toBe('offset:2')
  })

  it('stops cursor when page is not full', async () => {
    setIpcMock(async (command, args) => {
      if (command !== 'sftp_list') return undefined
      const payload = args as {path: string}
      return [{name: 'single.log', path: `${payload.path}/single.log`, isDirectory: false, size: 1, modified: 0}]
    })

    const page = await listRemoteDirectoryPage(session, '/var/log', {cursor: 'offset:2', limit: 2})

    expect(page.items).toHaveLength(1)
    expect(page.nextCursor).toBeNull()
  })

  it('reuses shared SSH connection mapping for SFTP calls', async () => {
    let payload: unknown
    setIpcMock(async (command, args) => {
      if (command === 'sftp_read_file') {
        payload = args
        return 'content'
      }
      return undefined
    })

    await readRemoteFile(passwordSession, '/var/app.env')

    expect(payload).toEqual({
      connection: {
        host: 'example.com',
        port: 22,
        username: 'alice',
        password: 'secret',
        privateKeyPath: null,
        passphrase: null,
        authMethod: 'password',
        credentialRef: {service: 'vrshell', key: 'session:password'},
      },
      remotePath: '/var/app.env',
    })
  })
})

