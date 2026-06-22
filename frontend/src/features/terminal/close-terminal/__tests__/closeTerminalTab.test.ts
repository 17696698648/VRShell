import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {enqueueTerminalInput, terminalState} from '../../../../entities/terminal'
import {clearDialogs, dialogState, resolveConfirm} from '../../../../shared/dialog'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {closeTerminalTab} from '../closeTerminalTab'

const defaultTerminals = [{id: 'term-test', sessionId: 'session-test', backendSessionId: 'backend-test', title: 'test-terminal', status: 'connected', cwd: '/', lines: []}] as typeof terminalState.tabs
const defaultActiveTerminalId = 'term-test'

describe('closeTerminalTab', () => {
  beforeEach(() => {
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    clearDialogs()
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  it('closes disconnected terminals without confirmation', async () => {
    const tab = terminalState.tabs[0]
    tab.status = 'disconnected'

    await expect(closeTerminalTab(tab)).resolves.toBe(true)

    expect(dialogState.confirm).toBeNull()
    expect(terminalState.tabs.some((item) => item.id === tab.id)).toBe(false)
  })

  it('disconnects backend session after closing terminal', async () => {
    const tab = terminalState.tabs[0]
    tab.status = 'disconnected'
    let disconnectPayload: unknown = null
    setIpcMock(async (command, args) => {
      if (command === 'disconnect_session') disconnectPayload = args
      return undefined
    })

    await closeTerminalTab(tab)
    await Promise.resolve()

    expect(disconnectPayload).toEqual({sessionId: tab.backendSessionId})
  })

  it('reports backend disconnect failures without reopening the tab', async () => {
    const tab = terminalState.tabs[0]
    tab.status = 'disconnected'
    setIpcMock(async (command) => {
      if (command === 'disconnect_session') throw new Error('disconnect failed')
      return undefined
    })

    await closeTerminalTab(tab)
    await flushPromises()

    expect(terminalState.tabs.some((item) => item.id === tab.id)).toBe(false)
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'warning', title: `Failed to disconnect ${tab.title}`})
  })

  it('requires confirmation before closing connected terminals', async () => {
    const tab = terminalState.tabs[0]
    const result = closeTerminalTab(tab)

    expect(dialogState.confirm).toMatchObject({title: 'Close terminal'})
    resolveConfirm(false)

    await expect(result).resolves.toBe(false)
    expect(terminalState.tabs.some((item) => item.id === tab.id)).toBe(true)
  })

  it('warns about queued input before closing', async () => {
    const tab = terminalState.tabs[0]
    tab.status = 'disconnected'
    enqueueTerminalInput(tab.id, 'pwd')
    const result = closeTerminalTab(tab)

    expect(dialogState.confirm?.message).toContain('queued input')
    resolveConfirm(true)

    await expect(result).resolves.toBe(true)
    expect(terminalState.tabs.some((item) => item.id === tab.id)).toBe(false)
  })
})

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}
