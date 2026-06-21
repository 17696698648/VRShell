import {afterEach, describe, expect, it} from 'vitest'
import {clearTerminalInputQueues, getTerminalInputQueueLength, terminalState} from '../../../../entities/terminal'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {sendInputToActiveTerminal} from '../sendTerminalInput'

const defaultTabStatus = terminalState.tabs[0]?.status

describe('sendInputToActiveTerminal', () => {
  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    clearTerminalInputQueues()
    if (terminalState.tabs[0]) terminalState.tabs[0].status = defaultTabStatus ?? 'connected'
  })

  it('appends local echo to active terminal', async () => {
    const tab = terminalState.tabs[0]
    terminalState.activeTerminalId = tab.id
    const before = tab.lines.length

    await sendInputToActiveTerminal('pwd')

    expect(tab.lines.length).toBe(before + 1)
    expect(tab.lines.at(-1)).toContain('pwd')
  })

  it('queues input when terminal is disconnected', async () => {
    const tab = terminalState.tabs[0]
    terminalState.activeTerminalId = tab.id
    tab.status = 'disconnected'

    await sendInputToActiveTerminal('pwd')

    expect(getTerminalInputQueueLength(tab.id)).toBe(1)
    expect(tab.lines.at(-1)).toContain('Queued input')
  })

  it('marks terminal failed and reports send errors', async () => {
    const tab = terminalState.tabs[0]
    terminalState.activeTerminalId = tab.id
    const before = tab.lines.length
    setIpcMock(async (command) => {
      if (command === 'send_input') throw new Error('write failed')
      return undefined
    })

    await expect(sendInputToActiveTerminal('pwd')).rejects.toThrow('send_input failed: write failed')

    expect(tab.status).toBe('failed')
    expect(tab.lines.length).toBe(before + 2)
    expect(tab.lines.at(-1)).toContain('Input failed')
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: `Failed to send input to ${tab.title}`})
  })
})
