import type { ComputedRef } from 'vue'
import type { SessionHost } from '../../components/SessionTreeGroup.vue'
import type { TerminalStatus, TerminalTab, WorkspaceState } from '../../types'
import {
  addTerminalTab,
  applyTerminalTabAction as dispatchTerminalTabAction,
  closeTerminalTab as closeTerminalTabState,
  createTerminalTabState as createTerminalTabModel,
  renameTerminalTab as renameTerminalTabState,
  selectTerminalTab as selectTerminalTabState,
  updateTerminalSessionId as updateTerminalTabSessionId,
  updateTerminalStatus as updateTerminalTabStatus,
} from '../terminal/useTerminalTabs'

export function useAppTerminalTabs({
  activeSession,
  activeWorkspace,
  clearTabActivity,
  copySshCommand,
  createTerminalId,
  disconnectTerminalRef,
  getWorkspaceState,
  onTerminalStatusChange,
  reconnectTerminalRef,
  scheduleActiveTerminalFit,
}: {
  activeSession: ComputedRef<SessionHost | undefined>
  activeWorkspace: ComputedRef<WorkspaceState>
  clearTabActivity: (terminalId: string) => void
  copySshCommand: () => void
  createTerminalId: () => string
  disconnectTerminalRef: (sessionName: string, terminalId: string) => void
  getWorkspaceState: (sessionName: string) => WorkspaceState
  onTerminalStatusChange: (sessionName: string, status: TerminalStatus) => void
  reconnectTerminalRef: (sessionName: string, terminalId: string) => void
  scheduleActiveTerminalFit: (terminalId?: string) => void
}) {
  function createTerminalTab() {
    addTerminalTab(activeWorkspace.value.terminalTabs, createTerminalId)
  }

  function createTerminalTabState(name: string, selected = false): TerminalTab {
    return createTerminalTabModel(createTerminalId(), name, selected)
  }

  function selectTerminalTab(terminalId: string) {
    selectTerminalTabState(activeWorkspace.value.terminalTabs, terminalId)
    scheduleActiveTerminalFit(terminalId)
  }

  function renameTerminalTab(terminalId: string) {
    const terminal = activeWorkspace.value.terminalTabs.find((item) => item.id === terminalId)
    const nextName = window.prompt('Enter terminal name', terminal?.name ?? '')?.trim()

    if (nextName) {
      renameTerminalTabState(activeWorkspace.value.terminalTabs, terminalId, nextName)
    }
  }

  function handleTerminalClosed(sessionName: string, terminalId: string) {
    updateTerminalStatus(sessionName, terminalId, 'disconnected')
    clearTabActivity(terminalId)
  }

  function updateTerminalSessionId(sessionName: string, terminalId: string, sessionId: string) {
    updateTerminalTabSessionId(getWorkspaceState(sessionName).terminalTabs, terminalId, sessionId)
  }

  function updateTerminalStatus(sessionName: string, terminalId: string, status: TerminalStatus, error = '') {
    updateTerminalTabStatus(getWorkspaceState(sessionName).terminalTabs, terminalId, status, error)
    onTerminalStatusChange(sessionName, status)
  }

  function closeTerminalTab(terminalId: string, sessionName = activeSession.value?.name) {
    if (!sessionName) {
      return
    }

    const workspace = getWorkspaceState(sessionName)

    if (!workspace.terminalTabs.some((terminal) => terminal.id === terminalId)) {
      return
    }

    disconnectTerminalRef(sessionName, terminalId)
    closeTerminalTabState(workspace.terminalTabs, terminalId, createTerminalId)
  }

  function applyTerminalTabAction(terminalId: string, action: string) {
    dispatchTerminalTabAction({
      terminals: activeWorkspace.value.terminalTabs,
      terminalId,
      action,
      createId: createTerminalId,
      reconnectTerminal: (id) => {
        if (activeSession.value) {
          reconnectTerminalRef(activeSession.value.name, id)
        }
      },
      copySshCommand,
      closeTerminalTab,
      selectTerminalTab,
    })
  }

  function handleTerminalMoreSelect(event: Event) {
    const nextTerminalId = (event.target as HTMLSelectElement).value
    if (nextTerminalId) selectTerminalTab(nextTerminalId)
    ;(event.target as HTMLSelectElement).value = ''
  }

  return {
    applyTerminalTabAction,
    closeTerminalTab,
    createTerminalTab,
    createTerminalTabState,
    handleTerminalClosed,
    handleTerminalMoreSelect,
    renameTerminalTab,
    selectTerminalTab,
    updateTerminalSessionId,
    updateTerminalStatus,
  }
}
