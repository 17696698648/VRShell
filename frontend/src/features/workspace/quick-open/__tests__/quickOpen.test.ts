import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionState, type SessionHost} from '../../../../entities/session'
import {terminalState, type TerminalTab} from '../../../../entities/terminal'
import {workspaceState} from '../../../../entities/workspace'
import {activateQuickOpenItem, closeQuickOpen, getQuickOpenItems, openQuickOpen} from '../quickOpen'

const session: SessionHost = {id: 'quick-session', name: 'Quick Session', host: 'example.com', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'connected'}
const terminal: TerminalTab = {id: 'quick-terminal', sessionId: session.id, backendSessionId: 'backend-quick-terminal', title: 'Quick Terminal', status: 'connected', cwd: '/', lines: []}
const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultActiveSessionId = sessionState.activeSessionId
const defaultTerminals = JSON.parse(JSON.stringify(terminalState.tabs)) as typeof terminalState.tabs
const defaultActiveTerminalId = terminalState.activeTerminalId

describe('quickOpen', () => {
  beforeEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, JSON.parse(JSON.stringify(session)))
    sessionState.activeSessionId = session.id
    terminalState.tabs.splice(0, terminalState.tabs.length, JSON.parse(JSON.stringify(terminal)))
    terminalState.activeTerminalId = terminal.id
  })

  afterEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    sessionState.activeSessionId = defaultActiveSessionId
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
    closeQuickOpen()
  })

  it('opens and closes quick open', () => {
    openQuickOpen()
    expect(workspaceState.quickOpenOpen).toBe(true)

    closeQuickOpen()
    expect(workspaceState.quickOpenOpen).toBe(false)
  })

  it('builds terminal and session items', () => {
    const items = getQuickOpenItems(sessionState.sessions, terminalState.tabs)

    expect(items.some((item) => item.kind === 'terminal')).toBe(true)
    expect(items.some((item) => item.kind === 'session')).toBe(true)
  })

  it('activates terminal items', () => {
    const item = getQuickOpenItems(sessionState.sessions, terminalState.tabs).find((candidate) => candidate.kind === 'terminal')
    openQuickOpen()

    activateQuickOpenItem(item!)

    expect(terminalState.activeTerminalId).toBe(item!.tab.id)
    expect(workspaceState.quickOpenOpen).toBe(false)
  })

  it('activates session items', () => {
    const item = getQuickOpenItems(sessionState.sessions, terminalState.tabs).find((candidate) => candidate.kind === 'session')
    openQuickOpen()

    activateQuickOpenItem(item!)

    expect(sessionState.activeSessionId).toBe(item!.session.id)
    expect(workspaceState.quickOpenOpen).toBe(false)
  })
})
