import {afterEach, describe, expect, it} from 'vitest'
import {reorderTerminalTabs, terminalState} from '../terminal.store'

const originalTabs = JSON.parse(JSON.stringify(terminalState.tabs)) as typeof terminalState.tabs
const originalActiveTerminalId = terminalState.activeTerminalId

describe('terminal store', () => {
  afterEach(() => {
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(originalTabs)))
    terminalState.activeTerminalId = originalActiveTerminalId
  })

  it('reorders terminal tabs by id', () => {
    terminalState.tabs.push({...terminalState.tabs[0], id: 'second', title: 'second'})
    terminalState.tabs.push({...terminalState.tabs[0], id: 'third', title: 'third'})

    reorderTerminalTabs('third', terminalState.tabs[0].id)

    expect(terminalState.tabs.map((tab) => tab.id)).toEqual(['third', originalTabs[0].id, 'second'])
  })
})
