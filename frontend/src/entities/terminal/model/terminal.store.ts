import {reactive} from 'vue'
import {appendTerminalBuffer, initializeTerminalBuffer, removeTerminalBuffer} from './terminalBufferRegistry'
import {clearTerminalInputQueue} from './terminalInputQueue'
import {clearTerminalSendChains} from './terminalSendChain'
import type {TerminalTab} from './terminal.types'

interface TerminalState {
  activeTerminalId: string
  tabs: TerminalTab[]
}

const initialTabs: TerminalTab[] = []

for (const tab of initialTabs) initializeTerminalBuffer(tab.id, tab.lines)

export const terminalState = reactive<TerminalState>({
  activeTerminalId: '',
  tabs: initialTabs,
})

export function openTerminal(tab: TerminalTab) {
  const existing = terminalState.tabs.find((item) => item.id === tab.id)
  initializeTerminalBuffer(tab.id, tab.lines)
  if (existing) Object.assign(existing, tab)
  else terminalState.tabs.push(tab)
  terminalState.activeTerminalId = tab.id
}

export function appendTerminalLines(tabId: string, lines: string[]) {
  if (!terminalState.tabs.some((item) => item.id === tabId)) return
  appendTerminalBuffer(tabId, lines)
}

export function patchTerminal(tabId: string, patch: Partial<TerminalTab>) {
  const tab = terminalState.tabs.find((item) => item.id === tabId)
  if (tab) Object.assign(tab, patch)
}

export function hasTerminal(tabId: string) {
  return terminalState.tabs.some((item) => item.id === tabId)
}

export function markTerminalDisconnecting(tabId: string) {
  patchTerminal(tabId, {status: 'disconnecting'})
}

export function closeTerminal(tabId: string) {
  const index = terminalState.tabs.findIndex((tab) => tab.id === tabId)
  if (index >= 0) terminalState.tabs.splice(index, 1)
  removeTerminalBuffer(tabId)
  clearTerminalInputQueue(tabId)
  clearTerminalSendChains(tabId)
  if (terminalState.activeTerminalId === tabId) terminalState.activeTerminalId = terminalState.tabs[0]?.id ?? ''
}

export function reorderTerminalTabs(sourceId: string, targetId: string) {
  const sourceIndex = terminalState.tabs.findIndex((tab) => tab.id === sourceId)
  const targetIndex = terminalState.tabs.findIndex((tab) => tab.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return
  const [tab] = terminalState.tabs.splice(sourceIndex, 1)
  terminalState.tabs.splice(targetIndex, 0, tab)
}
