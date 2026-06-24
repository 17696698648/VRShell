import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {clearTerminalBuffers, getTerminalBufferLines, initializeTerminalBuffer, terminalState, type TerminalTab} from '../../../../entities/terminal'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {encodeTextBase64} from '../../../../shared/lib/base64'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {createTerminalEventProvider} from '../terminalEventProvider'

const terminal: TerminalTab = {id: 'event-terminal', sessionId: 'event-session', backendSessionId: 'backend-event-terminal', title: 'Event Terminal', status: 'connected', cwd: '/', lines: []}
const defaultTerminals = JSON.parse(JSON.stringify(terminalState.tabs)) as typeof terminalState.tabs
const defaultActiveTerminalId = terminalState.activeTerminalId

describe('terminal event provider', () => {
  beforeEach(() => {
    terminalState.tabs.splice(0, terminalState.tabs.length, JSON.parse(JSON.stringify(terminal)))
    terminalState.activeTerminalId = terminal.id
    initializeTerminalBuffer(terminal.id, [])
  })

  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    clearTerminalBuffers()
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  it('starts once and stops the polling adapter', () => {
    const setInterval = vi.fn(() => 1 as unknown as ReturnType<typeof window.setInterval>)
    const clearInterval = vi.fn()
    const provider = createTerminalEventProvider({setInterval, clearInterval})

    provider.start()
    provider.start()
    provider.stop()

    expect(setInterval).toHaveBeenCalledOnce()
    expect(clearInterval).toHaveBeenCalledWith(1)
  })

  it('writes decoded terminal output to the terminal buffer', async () => {
    setIpcMock(async (command) => {
      if (command === 'poll_events') return [{type: 'output', dataBase64: encodeTextBase64('hello')}]
      return undefined
    })

    await createTerminalEventProvider().pollOnce()

    expect(getTerminalBufferLines(terminal.id)).toEqual(['hello'])
    expect(terminalState.tabs[0].lines).toEqual([])
  })

  it('accepts backend snake_case terminal output payloads', async () => {
    setIpcMock(async (command) => {
      if (command === 'poll_events') return [{type: 'output', data_base64: encodeTextBase64('legacy')}]
      return undefined
    })

    await createTerminalEventProvider().pollOnce()

    expect(getTerminalBufferLines(terminal.id)).toEqual(['legacy'])
  })

  it('ignores malformed terminal output payloads', async () => {
    setIpcMock(async (command) => {
      if (command === 'poll_events') return [{type: 'output'}]
      return undefined
    })

    await createTerminalEventProvider().pollOnce()

    expect(getTerminalBufferLines(terminal.id)).toEqual([])
  })

  it('marks terminal failed and reports polling errors', async () => {
    setIpcMock(async (command) => {
      if (command === 'poll_events') throw new Error('read failed')
      return undefined
    })

    await createTerminalEventProvider().pollOnce()

    expect(terminalState.tabs[0].status).toBe('failed')
    expect(getTerminalBufferLines(terminal.id).at(-1)).toContain('Output polling failed')
    expect(feedbackState.toasts).toHaveLength(0)
  })
})
