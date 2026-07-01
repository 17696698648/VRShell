import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {sessionState} from '../../../../entities/session'
import {clearTerminalBuffers, getTerminalBufferLines, initializeTerminalBuffer, terminalState, type TerminalTab} from '../../../../entities/terminal'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {encodeTextBase64} from '../../../../shared/lib/base64'
import {clearLogs, logState} from '../../../../shared/lib/logger'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {createTerminalEventProvider, createTerminalOutputBatcher, handleTerminalError} from '../terminalEventProvider'

const terminal: TerminalTab = {id: 'event-terminal', sessionId: 'event-session', backendSessionId: 'backend-event-terminal', title: 'Event Terminal', status: 'connected', cwd: '/', lines: []}
const session = {id: 'event-session', name: 'Event Session', host: 'example.com', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'connected', backendSessionId: terminal.backendSessionId} as typeof sessionState.sessions[number]
const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultTerminals = JSON.parse(JSON.stringify(terminalState.tabs)) as typeof terminalState.tabs
const defaultActiveTerminalId = terminalState.activeTerminalId

describe('terminal event provider', () => {
  beforeEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, JSON.parse(JSON.stringify(session)))
    sessionState.activeSessionId = session.id
    terminalState.tabs.splice(0, terminalState.tabs.length, JSON.parse(JSON.stringify(terminal)))
    terminalState.activeTerminalId = terminal.id
    initializeTerminalBuffer(terminal.id, [])
  })

  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    clearLogs()
    clearTerminalBuffers()
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    sessionState.activeSessionId = ''
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
    expect(logState.entries.at(-1)).toMatchObject({source: 'terminal', message: 'Polled 1 terminal output event(s)', detail: 'terminalId=event-terminal'})
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

  it('ignores polling output when the terminal closes before the response settles', async () => {
    const resolvePoll = vi.fn<(events: unknown[]) => void>()
    setIpcMock(async (command) => {
      if (command === 'poll_events') {
        return new Promise((resolve) => {
          resolvePoll.mockImplementationOnce(resolve)
        })
      }
      return undefined
    })

    const poll = createTerminalEventProvider().pollOnce()
    await vi.waitUntil(() => resolvePoll.getMockImplementation() !== undefined)
    terminalState.tabs.splice(0, terminalState.tabs.length)
    resolvePoll([{type: 'output', dataBase64: encodeTextBase64('stale')}])
    await poll

    expect(getTerminalBufferLines(terminal.id)).toEqual([])
  })

  it('reports connection lost errors even for the active terminal', () => {
    handleTerminalError({sessionId: terminal.backendSessionId, error: 'Terminal connection lost: keepalive failed: [Session(-7)] Unable to send window-change packet'})

    expect(terminalState.tabs[0].status).toBe('failed')
    expect(sessionState.sessions[0]).toMatchObject({status: 'failed', backendSessionId: undefined})
    expect(getTerminalBufferLines(terminal.id).at(-1)).toContain('Terminal output failed')
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: 'Terminal output stopped for Event Terminal'})
  })

  it('batches terminal output until scheduled flush', () => {
    const scheduleOutputFlush = vi.fn(() => 1)
    const batcher = createTerminalOutputBatcher({scheduleOutputFlush})

    batcher.enqueue(terminal.id, 'first')
    batcher.enqueue(terminal.id, 'second')

    expect(scheduleOutputFlush).toHaveBeenCalledOnce()
    expect(getTerminalBufferLines(terminal.id)).toEqual([])

    batcher.flush()

    expect(getTerminalBufferLines(terminal.id)).toEqual(['first', 'second'])
    expect(logState.entries.at(-1)).toMatchObject({source: 'terminal', message: 'Flushed 2 terminal output line(s)'})
  })

  it('records safe lifecycle diagnostics without terminal output content', () => {
    const provider = createTerminalEventProvider({setInterval: vi.fn(() => 1 as unknown as ReturnType<typeof window.setInterval>), clearInterval: vi.fn()})

    provider.start()
    provider.stop()

    expect(logState.entries.map((entry) => entry.message)).toContain('Terminal events started in poll mode (180ms)')
    expect(logState.entries.map((entry) => entry.message)).toContain('Terminal events stopped')
    expect(JSON.stringify(logState.entries)).not.toContain('pending')
  })

  it('cancels pending terminal output batches', () => {
    const cancelOutputFlush = vi.fn()
    const batcher = createTerminalOutputBatcher({scheduleOutputFlush: () => 7, cancelOutputFlush})

    batcher.enqueue(terminal.id, 'pending')
    batcher.cancel()
    batcher.flush()

    expect(cancelOutputFlush).toHaveBeenCalledWith(7)
    expect(getTerminalBufferLines(terminal.id)).toEqual([])
  })
})
