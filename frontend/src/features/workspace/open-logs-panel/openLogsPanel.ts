import {workspaceState, type WorkspaceDockPanel} from '../../../entities/workspace'

export function openDockPanel(panel: Exclude<WorkspaceDockPanel, 'none'>) {
  workspaceState.activeMainView = 'terminal'
  workspaceState.activeBottomDockPanel = panel
  workspaceState.recentBottomDockPanel = panel
  workspaceState.bottomPanelVisible = true
}

export function closeDockPanel() {
  if (workspaceState.bottomPanelVisible && workspaceState.activeBottomDockPanel !== 'none') {
    workspaceState.recentBottomDockPanel = workspaceState.activeBottomDockPanel as Exclude<WorkspaceDockPanel, 'none'>
    workspaceState.activeBottomDockPanel = 'none'
    workspaceState.bottomPanelVisible = false
  }
}

export function reopenRecentDockPanel() {
  openDockPanel(workspaceState.recentBottomDockPanel)
}

export function openLogsPanel() {
  openDockPanel('logs')
}

export function closeLogsPanel() {
  closeDockPanel()
}
