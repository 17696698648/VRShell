import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {terminalState} from '../../../../entities/terminal'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {startTerminalOutputPolling, stopTerminalOutputPolling} from '../pollTerminalOutput'

const defaultTerminals = [{id: 'term-test', sessionId: 'session-test', backendSessionId: 'backend-test', title: 'test-terminal', status: 'connected', cwd: '/', lines: []}] as typeof terminalState.tabs
const defaultActiveTerminalId = 'term-test'

describe('terminal output polling lifecycle', () => {
  beforeEach(() => {
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  afterEach(() => {
    stopTerminalOutputPolling()
    setIpcMock(null)
    clearToasts()
    vi.unstubAllGlobals()
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
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

  it('marks terminal failed and reports polling errors', async () => {
    const tab = terminalState.tabs[0]
    tab.status = 'connected'
    let intervalCallback: () => void | Promise<void> = () => {}
    vi.stubGlobal('window', {
      setInterval: vi.fn((callback) => {
        intervalCallback = callback
        return 1
      }),
      clearInterval: vi.fn(),
    })
    setIpcMock(async (command) => {
      if (command === 'poll_events') throw new Error('read failed')
      return undefined
    })

    startTerminalOutputPolling()
    await intervalCallback()

    expect(tab.status).toBe('failed')
    expect(tab.lines.at(-1)).toContain('Output polling failed')
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: `Terminal output stopped for ${tab.title}`})
  })
})
