import {afterEach, describe, expect, it} from 'vitest'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {persistSessionAuth, resolveSessionAuth} from '../sessionCredentials'

describe('sessionCredentials', () => {
  afterEach(() => setIpcMock(null))

  it('stores password auth in keyring and returns a credential reference', async () => {
    let stored: unknown
    setIpcMock(async (command, args) => {
      if (command === 'keyring_store') stored = args
      return undefined
    })

    const auth = await persistSessionAuth('session-1', {type: 'password', password: ' secret '})

    expect(stored).toMatchObject({service: 'vrshell', key: 'session:session-1:password', value: 'secret'})
    expect(auth).toMatchObject({type: 'password', password: 'secret', credentialRef: {service: 'vrshell', key: 'session:session-1:password'}})
  })

  it('resolves password auth from its credential reference', async () => {
    setIpcMock(async (command) => command === 'keyring_get' ? 'restored-secret' : undefined)

    const auth = await resolveSessionAuth({type: 'password', password: null, credentialRef: {service: 'vrshell', key: 'session:session-1:password'}})

    expect(auth).toMatchObject({type: 'password', password: 'restored-secret'})
  })

  it('falls back to the stable session password key after restart', async () => {
    let requested: unknown
    setIpcMock(async (command, args) => {
      if (command === 'keyring_get') {
        requested = args
        return 'restored-secret'
      }
      return undefined
    })

    const auth = await resolveSessionAuth({type: 'password', password: null}, 'session-1')

    expect(requested).toEqual({service: 'vrshell', key: 'session:session-1:password'})
    expect(auth).toMatchObject({type: 'password', password: 'restored-secret', credentialRef: {service: 'vrshell', key: 'session:session-1:password'}})
  })
})
