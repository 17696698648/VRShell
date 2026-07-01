import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionState} from '../../../../entities/session'
import {terminalState} from '../../../../entities/terminal'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {disconnectTerminalTab, reconnectTerminalTab} from '../manageTerminalConnection'

const defaultSessions = [{id: 'session-test', name: 'session-test', host: 'example.com', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'connected', auth: {type: 'agent'}, backendSessionId: 'backend-test'}] as typeof sessionState.sessions
const defaultTerminals = [{id: 'term-test', sessionId: 'session-test', backendSessionId: 'backend-test', title: 'test-terminal', status: 'connected', cwd: '/', lines: []}] as typeof terminalState.tabs
const defaultActiveTerminalId = 'term-test'

describe('manageTerminalConnection', () => {
  beforeEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

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

    expect(tab.status).toBe('connected')
    expect(tab.backendSessionId).toBe('mock-deploy-example.com')
    expect(terminalState.tabs.filter((item) => item.sessionId === tab.sessionId)).toHaveLength(1)
    expect(sessionState.sessions[0]).toMatchObject({status: 'connected', backendSessionId: 'mock-deploy-example.com'})
  })

  it('marks terminal failed when reconnect cannot establish a session', async () => {
    const tab = terminalState.tabs[0]
    const session = sessionState.sessions[0]
    tab.status = 'disconnected'
    session.status = 'idle'
    session.backendSessionId = undefined
    setIpcMock(async (command) => {
      if (command === 'connect_ssh') throw new Error('network down')
      return undefined
    })

    await expect(reconnectTerminalTab(tab)).rejects.toThrow('connect_ssh failed: network down')

    expect(tab.status).toBe('failed')
    expect(session.status).toBe('failed')
    expect(session.backendSessionId).toBeUndefined()
  })
})
