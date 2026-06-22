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

  it('redacts sensitive values from messages', () => {
    const error = normalizeIpcError('connect_ssh', new Error('password=secret token=abc'))

    expect(error.message).toBe('connect_ssh failed: password=[redacted] token=[redacted]')
  })

  it('shows not implemented as a user-facing placeholder', () => {
    const error = normalizeIpcError('sftp_download', {code: 'notImplemented', message: 'sftp download is not implemented'})

    expect(error.message).toBe('sftp_download failed: 功能建设中，当前版本暂不可用')
  })
})
