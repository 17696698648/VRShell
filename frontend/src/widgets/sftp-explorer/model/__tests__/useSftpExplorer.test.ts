import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {nextTick} from 'vue'
import {sessionState, type SessionHost} from '../../../../entities/session'
import {sftpSessionStates, sftpState} from '../../../../entities/sftp'
import {terminalState} from '../../../../entities/terminal'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {useSftpExplorer} from '../useSftpExplorer'

const activeSession: SessionHost = {id: 'sftp-explorer-session', name: 'SFTP Explorer Session', host: 'example.com', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'connected', backendSessionId: 'backend-sftp-explorer-session'}
const secondarySession: SessionHost = {id: 'sftp-explorer-session-2', name: 'SFTP Explorer Session 2', host: 'example.org', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'connected', backendSessionId: 'backend-sftp-explorer-session-2'}
const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultActiveSessionId = sessionState.activeSessionId
const defaultPath = sftpState.path
const defaultItems = JSON.parse(JSON.stringify(sftpState.items)) as typeof sftpState.items
const defaultTerminalTabs = JSON.parse(JSON.stringify(terminalState.tabs)) as typeof terminalState.tabs
const defaultActiveTerminalId = terminalState.activeTerminalId

describe('useSftpExplorer', () => {
  beforeEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, JSON.parse(JSON.stringify(activeSession)))
    sessionState.activeSessionId = activeSession.id
    terminalState.tabs.splice(0, terminalState.tabs.length)
    terminalState.activeTerminalId = ''
    for (const sessionId of Object.keys(sftpSessionStates)) delete sftpSessionStates[sessionId]
    sftpState.connectedSessionId = ''
    sftpState.path = '/srv/app'
    sftpState.items.splice(0, sftpState.items.length)
    sftpState.error = ''
    sftpState.loading = false
  })

  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    sessionState.activeSessionId = defaultActiveSessionId
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminalTabs)))
    terminalState.activeTerminalId = defaultActiveTerminalId
    for (const sessionId of Object.keys(sftpSessionStates)) delete sftpSessionStates[sessionId]
    sftpState.connectedSessionId = ''
    sftpState.path = defaultPath
    sftpState.items.splice(0, sftpState.items.length, ...JSON.parse(JSON.stringify(defaultItems)))
    sftpState.error = ''
    sftpState.loading = false
  })

  it('refreshes directory items through mock repository', async () => {
    terminalState.tabs.push(connectedTerminal(activeSession.id))
    const {refresh} = useSftpExplorer()

    await refresh('/tmp')

    expect(sftpState.path).toBe('/tmp')
    expect(sftpState.items.length).toBeGreaterThan(0)
    expect(sftpState.loading).toBe(false)
  })

  it('reports directory listing failures', async () => {
    terminalState.tabs.push(connectedTerminal(activeSession.id))
    const {refresh} = useSftpExplorer()
    setIpcMock(async (command) => {
      if (command === 'sftp_list') throw new Error('permission denied')
      return undefined
    })

    await refresh('/root')

    expect(sftpState.loading).toBe(false)
    expect(sftpState.error).toBe('permission denied')
    expect(feedbackState.toasts).toHaveLength(0)
  })

  it('does not start directory loading when reconnect is required', async () => {
    let listCalls = 0
    setIpcMock(async (command) => {
      if (command === 'sftp_list') listCalls += 1
      return undefined
    })
    const {refresh} = useSftpExplorer()

    await refresh('/srv/app')

    expect(listCalls).toBe(0)
    expect(sftpState.loading).toBe(false)
    expect(sftpState.error).toContain('Reconnect before loading SFTP directories')
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'warning', title: 'Reconnect required for SFTP'})
  })

  it('shows disconnected state until the active session has a connected terminal', async () => {
    const {hasConnectedTerminal} = useSftpExplorer()

    expect(hasConnectedTerminal.value).toBe(false)
    expect(sftpState.connectedSessionId).toBe('')
    expect(sftpState.path).toBe('/')

    terminalState.tabs.push(connectedTerminal(activeSession.id))
    await nextTick()

    expect(hasConnectedTerminal.value).toBe(true)
    expect(sftpState.connectedSessionId).toBe(activeSession.id)
  })

  it('clears the active sftp state when the connected terminal disconnects', async () => {
    terminalState.tabs.push(connectedTerminal(activeSession.id))
    const {refresh} = useSftpExplorer()
    await nextTick()
    await refresh('/tmp')

    terminalState.tabs[0].status = 'disconnected'
    await nextTick()

    expect(sftpState.connectedSessionId).toBe('')
    expect(sftpState.path).toBe('/')
    expect(sftpState.items).toHaveLength(0)
  })

  it('restores the last loaded directory per active session', async () => {
    sessionState.sessions.splice(0, sessionState.sessions.length, JSON.parse(JSON.stringify(activeSession)), JSON.parse(JSON.stringify(secondarySession)))
    terminalState.tabs.push(connectedTerminal(activeSession.id), connectedTerminal(secondarySession.id))
    terminalState.activeTerminalId = `terminal-${activeSession.id}`
    const {refresh} = useSftpExplorer()

    await refresh('/srv/app')
    expect(sftpSessionStates[activeSession.id]?.path).toBe('/srv/app')
    terminalState.activeTerminalId = `terminal-${secondarySession.id}`
    await nextTick()
    await refresh('/var/log')
    expect(sftpSessionStates[secondarySession.id]?.path).toBe('/var/log')
    terminalState.activeTerminalId = `terminal-${activeSession.id}`
    await nextTick()

    expect(sftpState.connectedSessionId).toBe(activeSession.id)
    expect(sftpState.path).toBe('/srv/app')

    terminalState.activeTerminalId = `terminal-${secondarySession.id}`
    await nextTick()

    expect(sftpState.connectedSessionId).toBe(secondarySession.id)
    expect(sftpState.path).toBe('/var/log')
  })
})

function connectedTerminal(sessionId: string) {
  return {id: `terminal-${sessionId}`, sessionId, backendSessionId: `backend-${sessionId}`, title: sessionId, status: 'connected' as const, cwd: '/', lines: []}
}
