import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {appendTerminalLines, closeTerminal, reorderTerminalTabs, terminalState} from '../terminal.store'
import {clearTerminalBuffers, getTerminalBufferLines, initializeTerminalBuffer} from '../terminalBufferRegistry'
import {clearTerminalSendChains, enqueueTerminalSend, getTerminalSendChainCount} from '../terminalSendChain'

const originalTabs = [{id: 'term-test', sessionId: 'session-test', backendSessionId: 'backend-test', title: 'test-terminal', status: 'connected', cwd: '/', lines: []}] as typeof terminalState.tabs
const originalActiveTerminalId = 'term-test'

describe('terminal store', () => {
  beforeEach(resetTerminalState)
  afterEach(resetTerminalState)

  it('keeps terminal output outside reactive tab metadata', () => {
    const tab = terminalState.tabs[0]

    appendTerminalLines(tab.id, ['hello'])

    expect(tab.lines).toEqual([])
    expect(getTerminalBufferLines(tab.id)).toEqual(['hello'])
  })

  it('clears pending send chains when closing terminal', async () => {
    const tab = terminalState.tabs[0]
    const blockedSend = createDeferred()

    const pending = enqueueTerminalSend(tab.id, () => blockedSend.promise)
    await Promise.resolve()
    expect(getTerminalSendChainCount()).toBe(1)

    closeTerminal(tab.id)
    expect(getTerminalSendChainCount()).toBe(0)

    blockedSend.resolve()
    await pending
  })

  it('reorders terminal tabs by id', () => {
    terminalState.tabs.push({...terminalState.tabs[0], id: 'second', title: 'second'})
    terminalState.tabs.push({...terminalState.tabs[0], id: 'third', title: 'third'})

    reorderTerminalTabs('third', terminalState.tabs[0].id)

    expect(terminalState.tabs.map((tab) => tab.id)).toEqual(['third', originalTabs[0].id, 'second'])
  })
})

function resetTerminalState() {
  clearTerminalBuffers()
  clearTerminalSendChains()
  terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(originalTabs)))
  initializeTerminalBuffer(originalActiveTerminalId, [])
  terminalState.activeTerminalId = originalActiveTerminalId
}

function createDeferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return {promise, resolve}
}
