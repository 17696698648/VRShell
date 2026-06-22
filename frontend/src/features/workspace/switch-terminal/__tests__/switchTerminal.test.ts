import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {terminalState} from '../../../../entities/terminal'
import {switchTerminal} from '../switchTerminal'

const defaultTerminals = [{id: 'term-test', sessionId: 'session-test', backendSessionId: 'backend-test', title: 'test-terminal', status: 'connected', cwd: '/', lines: []}] as typeof terminalState.tabs
const defaultActiveTerminalId = ''

describe('switchTerminal', () => {
  beforeEach(() => {
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  afterEach(() => {
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  it('switches to existing terminal tabs', () => {
    const tab = terminalState.tabs[0]

    switchTerminal(tab.id)

    expect(terminalState.activeTerminalId).toBe(tab.id)
  })

  it('ignores missing terminal tabs', () => {
    switchTerminal('missing')

    expect(terminalState.activeTerminalId).toBe(defaultActiveTerminalId)
  })
})
