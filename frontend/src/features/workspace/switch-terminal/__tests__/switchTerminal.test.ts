import {afterEach, describe, expect, it} from 'vitest'
import {terminalState} from '../../../../entities/terminal'
import {switchTerminal} from '../switchTerminal'

const defaultActiveTerminalId = terminalState.activeTerminalId

describe('switchTerminal', () => {
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
