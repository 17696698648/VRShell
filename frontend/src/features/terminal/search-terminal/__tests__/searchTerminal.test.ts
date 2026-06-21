import {afterEach, describe, expect, it} from 'vitest'
import {clearTerminalBuffers, initializeTerminalBuffer, terminalState} from '../../../../entities/terminal'
import {
  closeTerminalSearch,
  getTerminalSearchMatches,
  getTerminalSearchSummary,
  selectNextTerminalSearchMatch,
  selectPreviousTerminalSearchMatch,
  setTerminalSearchQuery,
  terminalSearchState,
  toggleTerminalSearch,
} from '../searchTerminal'

const tabId = terminalState.tabs[0].id

describe('terminal search', () => {
  afterEach(() => {
    closeTerminalSearch()
    clearTerminalBuffers()
    initializeTerminalBuffer(tabId, terminalState.tabs[0].lines)
  })

  it('finds matches in terminal buffer lines', () => {
    initializeTerminalBuffer(tabId, ['alpha', 'connected one', 'connected two'])
    terminalSearchState.open = false
    toggleTerminalSearch()
    setTerminalSearchQuery('connected')

    const matches = getTerminalSearchMatches(tabId)

    expect(terminalSearchState.open).toBe(true)
    expect(matches.map((match) => match.index)).toEqual([1, 2])
  })

  it('tracks current match index', () => {
    initializeTerminalBuffer(tabId, ['target one', 'target two'])
    setTerminalSearchQuery('target')

    expect(getTerminalSearchSummary(tabId)).toMatchObject({current: 1, total: 2})

    selectNextTerminalSearchMatch(tabId)
    expect(getTerminalSearchSummary(tabId)).toMatchObject({current: 2, total: 2})

    selectNextTerminalSearchMatch(tabId)
    expect(getTerminalSearchSummary(tabId)).toMatchObject({current: 1, total: 2})

    selectPreviousTerminalSearchMatch(tabId)
    expect(getTerminalSearchSummary(tabId)).toMatchObject({current: 2, total: 2})
  })
})
