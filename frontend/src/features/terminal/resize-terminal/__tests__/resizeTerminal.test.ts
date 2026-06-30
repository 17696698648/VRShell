import {afterEach, describe, expect, it, vi} from 'vitest'
import {terminalState} from '../../../../entities/terminal'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {clearTerminalResizeTimers, getTerminalDimensions, resizeTerminal, scheduleTerminalResize} from '../resizeTerminal'

const terminalTab = {id: 'term-test', sessionId: 'session-test', backendSessionId: 'backend-test', title: 'test-terminal', status: 'connected', cwd: '/', lines: []} as typeof terminalState.tabs[number]

describe('resizeTerminal', () => {
  afterEach(() => {
    clearTerminalResizeTimers()
    terminalState.tabs.splice(0)
    terminalState.activeTerminalId = ''
    setIpcMock(null)
    clearToasts()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('calculates bounded terminal dimensions', () => {
    expect(getTerminalDimensions({width: 900, height: 440})).toEqual({cols: 100, rows: 20})
    expect(getTerminalDimensions({width: 1, height: 1})).toEqual({cols: 20, rows: 4})
  })

  it('sends resize requests through typed IPC', async () => {
    const tab = {...terminalTab}
    let payload: unknown = null
    setIpcMock(async (command, args) => {
      if (command === 'resize_pty') payload = args
      return undefined
    })

    await resizeTerminal(tab, {width: 900, height: 440})

    expect(payload).toEqual({sessionId: tab.backendSessionId, cols: 100, rows: 20})
  })

  it('debounces high-frequency scheduled resize requests', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', {setTimeout, clearTimeout})
    const tab = {...terminalTab}
    const payloads: unknown[] = []
    setIpcMock(async (command, args) => {
      if (command === 'resize_pty') payloads.push(args)
      return undefined
    })

    scheduleTerminalResize(tab, {cols: 80, rows: 24})
    scheduleTerminalResize(tab, {cols: 100, rows: 30})
    scheduleTerminalResize(tab, {cols: 120, rows: 40})
    await vi.runAllTimersAsync()

    expect(payloads).toEqual([{sessionId: tab.backendSessionId, cols: 120, rows: 40}])
  })

  it('skips duplicate resize dimensions after successful send', async () => {
    const tab = {...terminalTab}
    const payloads: unknown[] = []
    setIpcMock(async (command, args) => {
      if (command === 'resize_pty') payloads.push(args)
      return undefined
    })

    await resizeTerminal(tab, {cols: 100, rows: 30})
    await resizeTerminal(tab, {cols: 100, rows: 30})

    expect(payloads).toEqual([{sessionId: tab.backendSessionId, cols: 100, rows: 30}])
  })

  it('reports resize failures', async () => {
    const tab = {...terminalTab}
    setIpcMock(async (command) => {
      if (command === 'resize_pty') throw new Error('resize failed')
      return undefined
    })

    await expect(resizeTerminal(tab, {width: 900, height: 440})).resolves.toBeUndefined()

    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: `Failed to resize ${tab.title}`})
  })

  it('skips resize when terminal is already disconnected', async () => {
    const tab = {...terminalTab, status: 'disconnected'} as typeof terminalTab
    let calls = 0
    setIpcMock(async (command) => {
      if (command === 'resize_pty') calls += 1
      return undefined
    })

    await resizeTerminal(tab, {width: 900, height: 440})

    expect(calls).toBe(0)
    expect(feedbackState.toasts).toHaveLength(0)
  })

  it('does not report stale resize failures after terminal disconnects', async () => {
    const tab = {...terminalTab}
    terminalState.tabs.push(tab)
    setIpcMock(async (command) => {
      if (command === 'resize_pty') {
        tab.status = 'disconnected'
        throw new Error('failed to resize pty: [Session(-7)] Unable to send window-change packet')
      }
      return undefined
    })

    await resizeTerminal(tab, {width: 900, height: 440})

    expect(feedbackState.toasts).toHaveLength(0)
  })

  it('cancels scheduled resize when terminal disconnects before debounce flush', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', {setTimeout, clearTimeout})
    const tab = {...terminalTab}
    terminalState.tabs.push(tab)
    let calls = 0
    setIpcMock(async (command) => {
      if (command === 'resize_pty') calls += 1
      return undefined
    })

    scheduleTerminalResize(tab, {cols: 100, rows: 30})
    tab.status = 'disconnected'
    await vi.runAllTimersAsync()

    expect(calls).toBe(0)
    expect(feedbackState.toasts).toHaveLength(0)
  })
})
