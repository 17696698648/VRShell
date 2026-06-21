import {afterEach, describe, expect, it} from 'vitest'
import {sessionState} from '../../../../entities/session'
import {terminalState} from '../../../../entities/terminal'
import {workspaceState} from '../../../../entities/workspace'
import {activateQuickOpenItem, closeQuickOpen, getQuickOpenItems, openQuickOpen} from '../quickOpen'

const defaultActiveSessionId = sessionState.activeSessionId
const defaultActiveTerminalId = terminalState.activeTerminalId

describe('quickOpen', () => {
  afterEach(() => {
    sessionState.activeSessionId = defaultActiveSessionId
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
