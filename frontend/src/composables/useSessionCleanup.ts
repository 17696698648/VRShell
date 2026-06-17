import type { Ref } from 'vue'
import type { SessionHost } from '../components/SessionTreeGroup.vue'
import type { WorkspaceState } from '../types'
import type { TerminalComponentHandle } from './useTerminalRegistry'

export function useSessionCleanup({
  openedSessionNames,
  workspaceStates,
  getSessionTerminalRefs,
  removeSessionTerminalRefs,
  disconnectSftpSession,
  findHost,
  deleteWorkspaceState,
}: {
  openedSessionNames: Ref<string[]>
  workspaceStates: Record<string, WorkspaceState>
  getSessionTerminalRefs: (sessionName: string) => TerminalComponentHandle[]
  removeSessionTerminalRefs: (sessionName: string) => void
  disconnectSftpSession: (sessionName: string) => Promise<void>
  findHost: (sessionName: string) => SessionHost | undefined
  deleteWorkspaceState: (sessionName: string) => void
}) {
  function resetHostRuntimeState(hostName: string) {
    const host = findHost(hostName)

    if (host) {
      host.active = false
      host.status = 'idle'
      host.latency = '-'
    }
  }

  function hasDirtyEditors(hostName: string) {
    return Boolean(workspaceStates[hostName]?.editorTabs.some((file) => file.dirty))
  }

  async function disconnectSessionResources(hostName: string) {
    try {
      await Promise.all(getSessionTerminalRefs(hostName).map((terminal) => terminal.disconnect()))
    } catch {
    }

    await disconnectSftpSession(hostName)
    resetHostRuntimeState(hostName)
    removeSessionTerminalRefs(hostName)
  }

  async function cleanupClosedSession(hostName: string) {
    await disconnectSessionResources(hostName)
    deleteWorkspaceState(hostName)
    openedSessionNames.value = openedSessionNames.value.filter((name) => name !== hostName)
  }

  function disconnectAllSessionsBeforeExit() {
    const hostNames = [...openedSessionNames.value]

    hostNames.forEach((hostName) => {
      try {
        getSessionTerminalRefs(hostName).forEach((terminal) => {
          terminal.disconnect()
        })
      } catch {
      }

      void disconnectSftpSession(hostName)
      resetHostRuntimeState(hostName)
    })
  }

  return {
    hasDirtyEditors,
    resetHostRuntimeState,
    disconnectSessionResources,
    cleanupClosedSession,
    disconnectAllSessionsBeforeExit,
  }
}
