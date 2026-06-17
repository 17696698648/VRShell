import { computed, reactive } from 'vue'
import type { WorkspaceState } from '../types'

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
}

export function createDefaultWorkspaceState(): WorkspaceState {
  return {
    showEditorArea: false,
    editorPaneHeight: 230,
    sftpPath: '/',
    sftpFiles: [],
    sftpTree: [],
    sftpSearchText: '',
    sftpStatus: 'Please connect a session first',
    sftpSortKey: 'name',
    sftpSortDirection: 'asc',
    editorTabs: [],
    terminalTabs: [{ id: createId('terminal'), name: 'Terminal 1', selected: true, sessionId: '', status: 'idle', error: '' }],
  }
}

export function resetWorkspaceState(workspace: WorkspaceState) {
  const nextState = createDefaultWorkspaceState()
  workspace.showEditorArea = nextState.showEditorArea
  workspace.editorPaneHeight = nextState.editorPaneHeight
  workspace.sftpPath = nextState.sftpPath
  workspace.sftpFiles = nextState.sftpFiles
  workspace.sftpTree = nextState.sftpTree
  workspace.sftpSearchText = nextState.sftpSearchText
  workspace.sftpStatus = nextState.sftpStatus
  workspace.sftpSortKey = nextState.sftpSortKey
  workspace.sftpSortDirection = nextState.sftpSortDirection
  workspace.editorTabs = nextState.editorTabs
  workspace.terminalTabs = nextState.terminalTabs
}

export function useWorkspaceStore(activeSessionName: () => string | undefined) {
  const workspaceStates = reactive<Record<string, WorkspaceState>>({})

  function getWorkspaceState(sessionName: string) {
    if (!workspaceStates[sessionName]) {
      workspaceStates[sessionName] = createDefaultWorkspaceState()
    }

    return workspaceStates[sessionName]
  }

  const activeWorkspace = computed(() => {
    const sessionName = activeSessionName()
    return sessionName ? getWorkspaceState(sessionName) : createDefaultWorkspaceState()
  })

  function deleteWorkspaceState(sessionName: string) {
    delete workspaceStates[sessionName]
  }

  return {
    workspaceStates,
    activeWorkspace,
    getWorkspaceState,
    deleteWorkspaceState,
  }
}
