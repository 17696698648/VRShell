import {afterEach, describe, expect, it, vi} from 'vitest'
import {hostKeyState, requestHostKeyConfirmation} from '../../../../entities/security/model/hostKeyState'
import {securityApi} from '../../../../shared/ipc/ipcFacade'
import {acceptPendingHostKey, rejectPendingHostKey} from '../hostKeyActions'

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

describe('host key actions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    hostKeyState.pendingRequest = null
  })

  it('accepts pending host key with auth args and clears state', async () => {
    const acceptHostKey = vi.spyOn(securityApi, 'acceptHostKey').mockResolvedValue('session-1')
    const confirmation = requestHostKeyConfirmation(hostKeyEvent, {
      authMethod: 'password',
      password: 'secret',
      credentialRef: {service: 'vrshell', key: 'session:1:password'},
    })

    await acceptPendingHostKey()

    expect(acceptHostKey).toHaveBeenCalledWith({
      pendingId: 'pending-1',
      authMethod: 'password',
      password: 'secret',
      credentialRef: {service: 'vrshell', key: 'session:1:password'},
    })
    await expect(confirmation).resolves.toBe(true)
    expect(hostKeyState.pendingRequest).toBeNull()
  })

  it('ignores duplicate accept while submitting', async () => {
    let resolveAccept: ((sessionId: string) => void) | undefined
    const acceptHostKey = vi.spyOn(securityApi, 'acceptHostKey').mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveAccept = resolve
        }),
    )
    const confirmation = requestHostKeyConfirmation(hostKeyEvent)

    const firstAccept = acceptPendingHostKey()
    const secondAccept = acceptPendingHostKey()

    expect(acceptHostKey).toHaveBeenCalledTimes(1)
    expect(hostKeyState.pendingRequest).toMatchObject({submitting: true})
    resolveAccept?.('session-1')
    await firstAccept
    await secondAccept

    await expect(confirmation).resolves.toBe(true)
    expect(hostKeyState.pendingRequest).toBeNull()
  })

  it('does not accept changed host key without explicit verification flow', async () => {
    const acceptHostKey = vi.spyOn(securityApi, 'acceptHostKey').mockResolvedValue('session-1')
    const confirmation = requestHostKeyConfirmation(changedHostKeyEvent)

    await acceptPendingHostKey()

    expect(acceptHostKey).not.toHaveBeenCalled()
    expect(hostKeyState.pendingRequest).toMatchObject({
      pendingId: '',
      reason: 'changed',
      error: 'Host key has changed. Verify the fingerprint before trusting this host again.',
    })
    rejectPendingHostKey()
    await expect(confirmation).resolves.toBe(false)
  })

  it('clears changed host key state without reject IPC when pending id is empty', async () => {
    const rejectHostKey = vi.spyOn(securityApi, 'rejectHostKey').mockResolvedValue(undefined)
    const confirmation = requestHostKeyConfirmation(changedHostKeyEvent)

    await rejectPendingHostKey()

    expect(rejectHostKey).not.toHaveBeenCalled()
    await expect(confirmation).resolves.toBe(false)
    expect(hostKeyState.pendingRequest).toBeNull()
  })

  it('rejects pending host key and clears state', async () => {
    const rejectHostKey = vi.spyOn(securityApi, 'rejectHostKey').mockResolvedValue(undefined)
    const confirmation = requestHostKeyConfirmation(hostKeyEvent)

    await rejectPendingHostKey()

    expect(rejectHostKey).toHaveBeenCalledWith('pending-1')
    await expect(confirmation).resolves.toBe(false)
    expect(hostKeyState.pendingRequest).toBeNull()
  })

  it('keeps pending state and records an error when accept IPC fails', async () => {
    vi.spyOn(securityApi, 'acceptHostKey').mockRejectedValue(new Error('network lost'))
    const confirmation = requestHostKeyConfirmation(hostKeyEvent)

    await expect(acceptPendingHostKey()).rejects.toThrow('network lost')

    expect(hostKeyState.pendingRequest).toMatchObject({
      pendingId: 'pending-1',
      error: 'network lost',
      submitting: false,
    })
    rejectPendingHostKey()
    await expect(confirmation).resolves.toBe(false)
  })
})
