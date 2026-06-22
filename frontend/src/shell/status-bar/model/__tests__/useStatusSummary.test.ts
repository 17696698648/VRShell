import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionState, type SessionHost} from '../../../../entities/session'
import {sftpState} from '../../../../entities/sftp'
import {terminalState, type TerminalTab} from '../../../../entities/terminal'
import {useStatusSummary} from '../useStatusSummary'

const session: SessionHost = {id: 'status-session', name: 'Status Session', host: 'example.com', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'connected'}
const terminal: TerminalTab = {id: 'status-terminal', sessionId: session.id, backendSessionId: 'backend-status-terminal', title: 'Status Terminal', status: 'connected', cwd: '/', lines: []}
const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultTerminals = JSON.parse(JSON.stringify(terminalState.tabs)) as typeof terminalState.tabs
const defaultActiveTerminalId = terminalState.activeTerminalId
const defaultSftpError = sftpState.error
const defaultSftpLoading = sftpState.loading
const defaultSftpPath = sftpState.path

describe('useStatusSummary', () => {
  beforeEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, JSON.parse(JSON.stringify(session)))
    terminalState.tabs.splice(0, terminalState.tabs.length, JSON.parse(JSON.stringify(terminal)))
    terminalState.activeTerminalId = terminal.id
    sftpState.error = ''
    sftpState.loading = false
    sftpState.path = '/srv/app'
  })

  afterEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
    sftpState.error = defaultSftpError
    sftpState.loading = defaultSftpLoading
    sftpState.path = defaultSftpPath
  })

  it('summarizes healthy status', () => {
    const summary = useStatusSummary()

    expect(summary.connectedSessions.value).toBeGreaterThan(0)
    expect(summary.health.value).toBe(0)
    expect(summary.sftpStatus.value).toBe(sftpState.path)
  })

  it('summarizes failed sessions terminals and sftp errors', () => {
    sessionState.sessions[0].status = 'failed'
    terminalState.tabs[0].status = 'failed'
    sftpState.error = 'permission denied'
    const summary = useStatusSummary()

    expect(summary.failedSessions.value).toBe(1)
    expect(summary.failedTerminals.value).toBe(1)
    expect(summary.sftpStatus.value).toBe('Error')
    expect(summary.health.value).toBe(3)
  })
})
