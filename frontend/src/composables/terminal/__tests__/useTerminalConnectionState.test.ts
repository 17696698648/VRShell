import {describe, expect, it, vi} from 'vitest'
import {useTerminalConnectionState} from '../useTerminalConnectionState'

describe('useTerminalConnectionState', () => {
  it('transitions through connection lifecycle', () => {
    const emit = vi.fn()
    const state = useTerminalConnectionState(emit)

    state.markConnecting()
    expect(state.hasAttemptedConnection.value).toBe(true)
    expect(state.status.value).toBe('connecting')

    state.markConnected('sid')
    expect(state.sessionId.value).toBe('sid')
    expect(state.connected.value).toBe(true)

    state.markDisconnected()
    expect(state.sessionId.value).toBeNull()
    expect(state.connected.value).toBe(false)
    expect(state.status.value).toBe('disconnected')
  })

  it('records error state', () => {
    const state = useTerminalConnectionState(vi.fn())
    state.markError('boom')
    expect(state.connected.value).toBe(false)
    expect(state.status.value).toBe('boom')
  })
})
