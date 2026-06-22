import {workspaceState, type PanelPlacement, type WorkspaceDockPanel} from '../../../entities/workspace'

export function openDockPanel(panel: Exclude<WorkspaceDockPanel, 'none'>, placement: Exclude<PanelPlacement, 'sidebar' | 'floating'> = 'bottom') {
  workspaceState.activeMainView = 'terminal'
  workspaceState.activeDockPanel = panel
  workspaceState.recentDockPanel = panel
  workspaceState.bottomPanelVisible = true
  workspaceState.panelPlacement = placement
}

export function closeDockPanel() {
  if (workspaceState.activeDockPanel !== 'none') workspaceState.recentDockPanel = workspaceState.activeDockPanel
  workspaceState.activeDockPanel = 'none'
  workspaceState.bottomPanelVisible = false
}

export function reopenRecentDockPanel(placement: Exclude<PanelPlacement, 'sidebar' | 'floating'> = 'bottom') {
  openDockPanel(workspaceState.recentDockPanel, placement)
}

export function openLogsPanel() {
  openDockPanel('logs', 'bottom')
}

export function closeLogsPanel() {
  closeDockPanel()
}
