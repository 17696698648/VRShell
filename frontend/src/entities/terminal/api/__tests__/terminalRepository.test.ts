import {afterEach, describe, expect, it} from 'vitest'
import type {SessionHost} from '../../../session'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {connectTerminal} from '../terminalRepository'

describe('terminalRepository', () => {
  afterEach(() => setIpcMock(null))

  it('passes the selected auth method to connect_ssh', async () => {
    let payload: unknown
    setIpcMock(async (command, args) => {
      if (command === 'connect_ssh') {
        payload = args
        return 'backend-session'
      }
      return undefined
    })
    const session: SessionHost = {
      id: 'session-password',
      name: 'Password Session',
      host: 'example.com',
      port: 22,
      username: 'deploy',
      protocol: 'ssh',
      groupId: 'all',
      tags: [],
      status: 'idle',
      auth: {type: 'password', password: 'secret'},
    }

    await connectTerminal(session)

    expect(payload).toMatchObject({authMethod: 'password', password: 'secret', privateKeyPath: null})
  })
})
