import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {clearTerminalBuffers, clearTerminalInputQueues, clearTerminalSendChains, getTerminalBufferLines, getTerminalInputQueueLength, initializeTerminalBuffer, terminalState} from '../../../../entities/terminal'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {sendInputToActiveTerminal, sendTerminalDataToTerminalTab} from '../sendTerminalInput'

const defaultTerminals = [{id: 'term-test', sessionId: 'session-test', backendSessionId: 'backend-test', title: 'test-terminal', status: 'connected', cwd: '/', lines: []}] as typeof terminalState.tabs
const defaultActiveTerminalId = 'term-test'

describe('sendInputToActiveTerminal', () => {
  beforeEach(() => {
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    initializeTerminalBuffer(defaultActiveTerminalId, [])
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  afterEach(() => {
    clearTerminalSendChains()
    setIpcMock(null)
    clearToasts()
    clearTerminalInputQueues()
    clearTerminalBuffers()
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    initializeTerminalBuffer(defaultActiveTerminalId, [])
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  it('sends input without appending a local echo to active terminal', async () => {
    const tab = terminalState.tabs[0]
    terminalState.activeTerminalId = tab.id
    const before = getTerminalBufferLines(tab.id).length

    await sendInputToActiveTerminal('pwd')

    expect(getTerminalBufferLines(tab.id).length).toBe(before)
  })

  it('queues input when terminal is disconnected', async () => {
    const tab = terminalState.tabs[0]
    terminalState.activeTerminalId = tab.id
    tab.status = 'disconnected'

    await sendInputToActiveTerminal('pwd')

    expect(getTerminalInputQueueLength(tab.id)).toBe(1)
    expect(getTerminalBufferLines(tab.id).at(-1)).toContain('Queued input')
  })

  it('serializes concurrent terminal data writes per tab', async () => {
    const tab = terminalState.tabs[0]
    const sentPayloads: unknown[] = []
    const firstSend = createDeferred()
    setIpcMock(async (command, args) => {
      if (command !== 'send_input') return undefined
      sentPayloads.push(args)
      if (sentPayloads.length === 1) await firstSend.promise
      return undefined
    })

    const first = sendTerminalDataToTerminalTab(tab, 'first')
    const second = sendTerminalDataToTerminalTab(tab, 'second')
    await Promise.resolve()

    expect(sentPayloads).toHaveLength(1)
    firstSend.resolve()
    await Promise.all([first, second])

    expect(sentPayloads).toHaveLength(2)
  })

  it('continues queued writes after a failed write', async () => {
    const tab = terminalState.tabs[0]
    const sentPayloads: unknown[] = []
    setIpcMock(async (command, args) => {
      if (command !== 'send_input') return undefined
      sentPayloads.push(args)
      if (sentPayloads.length === 1) throw new Error('write failed')
      return undefined
    })

    const first = sendTerminalDataToTerminalTab(tab, 'first')
    const second = sendTerminalDataToTerminalTab(tab, 'second')

    await expect(first).rejects.toThrow('send_input failed: write failed')
    await expect(second).resolves.toBeUndefined()
    expect(sentPayloads).toHaveLength(2)
  })

  it('marks terminal failed and reports send errors', async () => {
    const tab = terminalState.tabs[0]
    terminalState.activeTerminalId = tab.id
    const before = getTerminalBufferLines(tab.id).length
    setIpcMock(async (command) => {
      if (command === 'send_input') throw new Error('write failed')
      return undefined
    })

    await expect(sendInputToActiveTerminal('pwd')).rejects.toThrow('send_input failed: write failed')

    const lines = getTerminalBufferLines(tab.id)
    expect(tab.status).toBe('failed')
    expect(lines.length).toBe(before + 1)
    expect(lines.at(-1)).toContain('Input failed')
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: `Failed to send input to ${tab.title}`})
  })
})

function createDeferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return {promise, resolve}
}
