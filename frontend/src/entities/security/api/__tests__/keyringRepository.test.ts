import {afterEach, describe, expect, it} from 'vitest'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {deleteCredential, getCredential, sessionPasswordRef, storeCredential} from '../keyringRepository'

describe('keyringRepository', () => {
  afterEach(() => setIpcMock(null))

  it('stores reads and deletes credentials through typed IPC', async () => {
    const credentialRef = sessionPasswordRef('abc')

    await storeCredential(credentialRef, 'secret')
    await expect(getCredential(credentialRef)).resolves.toBe('secret')
    await deleteCredential(credentialRef)
    await expect(getCredential(credentialRef)).resolves.toBeNull()
  })

  it('uses stable session password refs', () => {
    expect(sessionPasswordRef('abc')).toEqual({service: 'vrshell', key: 'session:abc:password'})
  })
})
