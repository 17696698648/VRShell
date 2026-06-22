import {workspaceState, type WorkspacePanel} from '../../../entities/workspace'

export function switchPanel(panel: WorkspacePanel) {
  workspaceState.activeMainView = 'terminal'
  workspaceState.activePanel = panel
}
