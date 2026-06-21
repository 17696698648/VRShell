import {workspaceState, type WorkspacePanel} from '../../../entities/workspace'

export function switchPanel(panel: WorkspacePanel) {
  workspaceState.activeMainView = 'workbench'
  workspaceState.activePanel = panel
}
