import {terminalState} from '../../../entities/terminal'

export function switchTerminal(tabId: string) {
  if (terminalState.tabs.some((tab) => tab.id === tabId)) {
    terminalState.activeTerminalId = tabId
  }
}
