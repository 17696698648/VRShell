import {afterEach, describe, expect, it} from 'vitest'
import {reorderTerminalTabs, terminalState} from '../terminal.store'

const originalTabs = [{id: 'term-test', sessionId: 'session-test', backendSessionId: 'backend-test', title: 'test-terminal', status: 'connected', cwd: '/', lines: []}] as typeof terminalState.tabs
const originalActiveTerminalId = 'term-test'

describe('terminal store', () => {
  afterEach(() => {
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(originalTabs)))
    terminalState.activeTerminalId = originalActiveTerminalId
  })

  it('reorders terminal tabs by id', () => {
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(originalTabs)))
    terminalState.tabs.push({...terminalState.tabs[0], id: 'second', title: 'second'})
    terminalState.tabs.push({...terminalState.tabs[0], id: 'third', title: 'third'})

    reorderTerminalTabs('third', terminalState.tabs[0].id)

    expect(terminalState.tabs.map((tab) => tab.id)).toEqual(['third', originalTabs[0].id, 'second'])
  })
})
