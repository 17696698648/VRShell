import {workspaceState, type WorkspacePanel} from '../../../entities/workspace'

export function switchPanel(panel: WorkspacePanel) {
  workspaceState.activeMainView = 'terminal'

  if (workspaceState.activePanel === panel && workspaceState.sidebarVisible) {
    workspaceState.sidebarVisible = false
    return
  }

  workspaceState.activePanel = panel
  workspaceState.sidebarVisible = true
}
