import {computed} from 'vue'
import {sessionState} from '../../../entities/session'
import {sftpState} from '../../../entities/sftp'
import {terminalState} from '../../../entities/terminal'
import {workspaceState} from '../../../entities/workspace'

export function useStatusSummary() {
  const connectedSessions = computed(() => sessionState.sessions.filter((session) => session.status === 'connected').length)
  const failedSessions = computed(() => sessionState.sessions.filter((session) => session.status === 'failed').length)
  const activeTerminal = computed(() => terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId) ?? null)
  const failedTerminals = computed(() => terminalState.tabs.filter((tab) => tab.status === 'failed').length)
  const sftpStatus = computed(() => {
    if (sftpState.loading) return 'Loading'
    if (sftpState.error) return 'Error'
    return sftpState.path
  })
  const health = computed(() => failedSessions.value + failedTerminals.value + (sftpState.error ? 1 : 0))

  return {
    activeTerminal,
    connectedSessions,
    failedSessions,
    failedTerminals,
    health,
    sftpStatus,
    terminalCount: computed(() => terminalState.tabs.length),
    theme: computed(() => workspaceState.theme),
  }
}
