import {describe, expect, it} from 'vitest'
import {IpcError, normalizeIpcError} from '../ipcErrors'

describe('ipcErrors', () => {
  it('formats error causes with command name', () => {
    const error = normalizeIpcError('connect_ssh', new Error('network down'))

    expect(error).toBeInstanceOf(IpcError)
    expect(error.message).toBe('connect_ssh failed: network down')
  })

  it('keeps existing ipc errors unchanged', () => {
    const original = new IpcError('poll_events', 'timeout')

    expect(normalizeIpcError('connect_ssh', original)).toBe(original)
  })
})
