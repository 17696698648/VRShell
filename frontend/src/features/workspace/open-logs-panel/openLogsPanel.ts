import {workspaceState, type PanelPlacement, type WorkspaceDockPanel} from '../../../entities/workspace'

export function openDockPanel(panel: Exclude<WorkspaceDockPanel, 'none'>, placement: Exclude<PanelPlacement, 'sidebar' | 'floating'> = 'bottom') {
  workspaceState.activeMainView = 'workbench'
  workspaceState.activeDockPanel = panel
  workspaceState.bottomPanelVisible = true
  workspaceState.panelPlacement = placement
}

export function closeDockPanel() {
  workspaceState.activeDockPanel = 'none'
  workspaceState.bottomPanelVisible = false
}

export function openLogsPanel() {
  openDockPanel('logs', 'bottom')
}

export function closeLogsPanel() {
  closeDockPanel()
}
