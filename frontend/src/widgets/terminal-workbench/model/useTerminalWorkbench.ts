import {computed} from 'vue'
import {terminalState} from '../../../entities/terminal'

export function useTerminalWorkbench() {
  const activeTerminal = computed(() => terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId) ?? null)
  return {terminalState, activeTerminal}
}
