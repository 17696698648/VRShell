import {reactive} from 'vue'

export function useTerminalActivity(getActiveTerminalId: () => string | undefined) {
  const tabActivitySet = reactive(new Set<string>())

  function markTerminalActivity(terminalId: string) {
    if (getActiveTerminalId() !== terminalId) {
      tabActivitySet.add(terminalId)
    }
  }

  function clearTabActivity(terminalId: string) {
    tabActivitySet.delete(terminalId)
  }

  return {
    clearTabActivity,
    markTerminalActivity,
    tabActivitySet,
  }
}
