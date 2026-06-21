import {afterEach, describe, expect, it} from 'vitest'
import {sessionState} from '../../../../entities/session'
import {terminalState} from '../../../../entities/terminal'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {disconnectTerminalTab, reconnectTerminalTab} from '../manageTerminalConnection'

const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultTerminals = JSON.parse(JSON.stringify(terminalState.tabs)) as typeof terminalState.tabs
const defaultActiveTerminalId = terminalState.activeTerminalId

describe('manageTerminalConnection', () => {
  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  it('disconnects terminal and marks session idle', async () => {
    const tab = terminalState.tabs[0]
    const session = sessionState.sessions.find((item) => item.id === tab.sessionId)

    await disconnectTerminalTab(tab)

    expect(tab.status).toBe('disconnected')
    expect(session?.status).toBe('idle')
    expect(session?.backendSessionId).toBeUndefined()
  })

  it('reports disconnect failures', async () => {
    const tab = terminalState.tabs[0]
    setIpcMock(async (command) => {
      if (command === 'disconnect_session') throw new Error('disconnect failed')
      return undefined
    })

    await expect(disconnectTerminalTab(tab)).rejects.toThrow('disconnect_session failed: disconnect failed')

    expect(tab.status).toBe('failed')
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: `Failed to disconnect ${tab.title}`})
  })

  it('reconnects terminal through its session', async () => {
    const tab = terminalState.tabs[0]
    tab.status = 'disconnected'
    setIpcMock(async (command, args) => {
      if (command === 'connect_ssh') return `mock-${(args as {username: string; host: string}).username}-${(args as {username: string; host: string}).host}`
      return undefined
    })

    await reconnectTerminalTab(tab)

    expect(terminalState.tabs.find((item) => item.id === tab.id)?.status).toBe('connected')
  })
})
