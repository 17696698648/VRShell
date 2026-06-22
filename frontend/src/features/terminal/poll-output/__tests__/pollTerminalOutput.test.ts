import {afterEach, describe, expect, it, vi} from 'vitest'
import {startTerminalOutputPolling, stopTerminalOutputPolling} from '../pollTerminalOutput'

describe('terminal output polling lifecycle', () => {
  afterEach(() => {
    stopTerminalOutputPolling()
    vi.unstubAllGlobals()
  })

  it('starts polling once and clears it on stop', () => {
    const setInterval = vi.fn(() => 1)
    const clearInterval = vi.fn()
    vi.stubGlobal('window', {setInterval, clearInterval})

    startTerminalOutputPolling()
    startTerminalOutputPolling()
    stopTerminalOutputPolling()

    expect(setInterval).toHaveBeenCalledOnce()
    expect(clearInterval).toHaveBeenCalledWith(1)
  })
})
