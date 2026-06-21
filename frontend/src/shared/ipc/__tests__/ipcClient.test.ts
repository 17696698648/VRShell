import {afterEach, describe, expect, it} from 'vitest'
import {IpcError, setIpcMock, typedInvoke} from '../ipcClient'

describe('typedInvoke', () => {
  afterEach(() => setIpcMock(null))

  it('wraps mock failures with command context', async () => {
    setIpcMock(async () => {
      throw new Error('network down')
    })

    await expect(typedInvoke('parse_ssh_config')).rejects.toMatchObject({
      name: 'IpcError',
      command: 'parse_ssh_config',
      message: 'parse_ssh_config failed: network down',
    })
  })

  it('keeps the original cause on IpcError', async () => {
    const cause = new Error('permission denied')
    setIpcMock(async () => {
      throw cause
    })

    try {
      await typedInvoke('parse_ssh_config')
    } catch (error) {
      expect(error).toBeInstanceOf(IpcError)
      expect((error as IpcError).cause).toBe(cause)
    }
  })
})
