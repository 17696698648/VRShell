import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionState} from '../../../entities/session'
import {terminalState} from '../../../entities/terminal'
import {setIpcMock} from '../../../shared/ipc/ipcClient'
import {createAppCommands} from '../createAppCommands'

const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultActiveSessionId = sessionState.activeSessionId
const defaultTerminals = JSON.parse(JSON.stringify(terminalState.tabs)) as typeof terminalState.tabs
const defaultActiveTerminalId = terminalState.activeTerminalId

describe('createAppCommands', () => {
  beforeEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, {
      id: 'session-reconnect',
      name: 'Reconnect target',
      host: 'example.com',
      port: 22,
      username: 'deploy',
      protocol: 'ssh',
      groupId: 'all',
      tags: [],
      status: 'idle',
    })
    sessionState.activeSessionId = 'session-reconnect'
    terminalState.tabs.splice(0, terminalState.tabs.length, {
      id: 'terminal-reconnect',
      sessionId: 'session-reconnect',
      backendSessionId: 'old-backend-session',
      title: 'Reconnect terminal',
      status: 'disconnected',
      cwd: '/',
      lines: [],
    })
    terminalState.activeTerminalId = 'terminal-reconnect'
  })

  afterEach(() => {
    setIpcMock(null)
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    sessionState.activeSessionId = defaultActiveSessionId
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  it('reconnects a session through its disconnected terminal', async () => {
    setIpcMock(async (command) => {
      if (command === 'connect_ssh') return 'new-backend-session'
      return undefined
    })
    const command = createAppCommands().find((item) => item.id === 'session.reconnect')

    await command?.run({sessionId: 'session-reconnect'})

    expect(terminalState.tabs[0]).toMatchObject({backendSessionId: 'new-backend-session', status: 'connected'})
    expect(sessionState.sessions[0]).toMatchObject({backendSessionId: 'new-backend-session', status: 'connected'})
  })
})
