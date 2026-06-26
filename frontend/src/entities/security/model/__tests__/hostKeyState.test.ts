import {afterEach, describe, expect, it} from 'vitest'
import {acceptHostKeyRequest, hostKeyState, rejectHostKeyRequest, requestHostKeyConfirmation, setHostKeyRequestError, setHostKeyRequestSubmitting} from '../hostKeyState'

const hostKeyEvent = {
  pendingId: 'pending-1',
  host: 'example.com',
  port: 22,
  fingerprint: 'SHA256:abc123',
  keyType: 'ssh-ed25519',
}

describe('host key state', () => {
  afterEach(() => {
    rejectHostKeyRequest()
    hostKeyState.pendingRequest = null
  })

  it('tracks a pending host key request with auth args', () => {
    const confirmation = requestHostKeyConfirmation(hostKeyEvent, {
      authMethod: 'password',
      password: 'secret',
      credentialRef: {service: 'vrshell', key: 'session:1:password'},
    })

    expect(hostKeyState.pendingRequest).toMatchObject({
      pendingId: 'pending-1',
      host: 'example.com',
      keyType: 'ssh-ed25519',
      reason: 'unknown',
      authArgs: {
        authMethod: 'password',
        credentialRef: {service: 'vrshell', key: 'session:1:password'},
      },
    })

    rejectHostKeyRequest()
    return expect(confirmation).resolves.toBe(false)
  })

  it('tracks submitting state on the pending host key request', () => {
    const confirmation = requestHostKeyConfirmation(hostKeyEvent)

    setHostKeyRequestSubmitting(true)

    expect(hostKeyState.pendingRequest).toMatchObject({submitting: true})
    rejectHostKeyRequest()
    return expect(confirmation).resolves.toBe(false)
  })

  it('stores an error on the pending host key request', () => {
    const confirmation = requestHostKeyConfirmation(hostKeyEvent)

    setHostKeyRequestError('network lost')

    expect(hostKeyState.pendingRequest).toMatchObject({error: 'network lost'})
    rejectHostKeyRequest()
    return expect(confirmation).resolves.toBe(false)
  })

  it('resolves true and clears state when accepted', async () => {
    const confirmation = requestHostKeyConfirmation(hostKeyEvent)

    acceptHostKeyRequest()

    await expect(confirmation).resolves.toBe(true)
    expect(hostKeyState.pendingRequest).toBeNull()
  })

  it('resolves false and clears state when rejected', async () => {
    const confirmation = requestHostKeyConfirmation(hostKeyEvent)

    rejectHostKeyRequest()

    await expect(confirmation).resolves.toBe(false)
    expect(hostKeyState.pendingRequest).toBeNull()
  })
})
