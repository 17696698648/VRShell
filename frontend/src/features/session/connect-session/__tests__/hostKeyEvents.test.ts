import {afterEach, describe, expect, it} from 'vitest'
import {hostKeyState, rejectHostKeyRequest} from '../../../../entities/security/model/hostKeyState'
import {handleHostKeyRequested} from '../hostKeyEvents'

const hostKeyEvent = {
  pendingId: 'pending-1',
  host: 'example.com',
  port: 22,
  fingerprint: 'SHA256:abc123',
  keyType: 'ssh-ed25519',
}

const changedHostKeyEvent = {
  ...hostKeyEvent,
  pendingId: '',
  reason: 'changed' as const,
  knownFingerprint: 'SHA256:old-key',
}

describe('host key events', () => {
  afterEach(() => {
    rejectHostKeyRequest()
    hostKeyState.pendingRequest = null
  })

  it('opens a changed host key confirmation from an IPC event', async () => {
    const confirmation = handleHostKeyRequested(changedHostKeyEvent)

    expect(hostKeyState.pendingRequest).toMatchObject({
      pendingId: '',
      reason: 'changed',
      knownFingerprint: 'SHA256:old-key',
      fingerprint: 'SHA256:abc123',
    })

    rejectHostKeyRequest()
    await expect(confirmation).resolves.toBe(false)
  })

  it('opens a pending host key confirmation from an IPC event', async () => {
    const confirmation = handleHostKeyRequested(hostKeyEvent)

    expect(hostKeyState.pendingRequest).toMatchObject({
      pendingId: 'pending-1',
      host: 'example.com',
      port: 22,
      fingerprint: 'SHA256:abc123',
      keyType: 'ssh-ed25519',
    })

    rejectHostKeyRequest()
    await expect(confirmation).resolves.toBe(false)
  })
})
