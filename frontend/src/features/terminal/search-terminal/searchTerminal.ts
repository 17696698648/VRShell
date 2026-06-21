import {reactive} from 'vue'
import {getTerminalBuffer} from '../../../entities/terminal'

export interface TerminalSearchMatch {
  index: number
  line: string
}

export const terminalSearchState = reactive({
  currentMatchIndex: 0,
  open: false,
  query: '',
})

export function toggleTerminalSearch() {
  terminalSearchState.open = !terminalSearchState.open
}

export function closeTerminalSearch() {
  terminalSearchState.open = false
  terminalSearchState.query = ''
  terminalSearchState.currentMatchIndex = 0
}

export function setTerminalSearchQuery(query: string) {
  terminalSearchState.query = query
  terminalSearchState.currentMatchIndex = 0
}

export function selectNextTerminalSearchMatch(tabId: string) {
  const matches = getTerminalSearchMatches(tabId)
  if (matches.length === 0) return
  terminalSearchState.currentMatchIndex = (terminalSearchState.currentMatchIndex + 1) % matches.length
}

export function selectPreviousTerminalSearchMatch(tabId: string) {
  const matches = getTerminalSearchMatches(tabId)
  if (matches.length === 0) return
  terminalSearchState.currentMatchIndex = (terminalSearchState.currentMatchIndex - 1 + matches.length) % matches.length
}

export function getTerminalSearchMatches(tabId: string): TerminalSearchMatch[] {
  const query = terminalSearchState.query.trim().toLowerCase()
  if (!query) return []
  return getTerminalBuffer(tabId).value
    .map((line, index) => ({line, index}))
    .filter((item) => item.line.toLowerCase().includes(query))
}

export function getTerminalSearchSummary(tabId: string) {
  const matches = getTerminalSearchMatches(tabId)
  return {
    current: matches.length === 0 ? 0 : terminalSearchState.currentMatchIndex + 1,
    matches,
    total: matches.length,
  }
}
