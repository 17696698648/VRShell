import {workspaceState, type PanelPlacement, type WorkspaceDockPanel} from '../../../entities/workspace'

export function openDockPanel(panel: Exclude<WorkspaceDockPanel, 'none'>, placement: Exclude<PanelPlacement, 'sidebar' | 'floating'> = 'bottom') {
  workspaceState.activeMainView = 'terminal'
  if (placement === 'right') {
    workspaceState.activeRightDockPanel = panel
    workspaceState.recentRightDockPanel = panel
    workspaceState.rightPanelVisible = true
  } else {
    workspaceState.activeBottomDockPanel = panel
    workspaceState.recentBottomDockPanel = panel
    workspaceState.bottomPanelVisible = true
  }
}

export function closeDockPanel() {
  if (workspaceState.bottomPanelVisible && workspaceState.activeBottomDockPanel !== 'none') {
    workspaceState.recentBottomDockPanel = workspaceState.activeBottomDockPanel as Exclude<WorkspaceDockPanel, 'none'>
    workspaceState.activeBottomDockPanel = 'none'
    workspaceState.bottomPanelVisible = false
    return
  }
  if (workspaceState.rightPanelVisible && workspaceState.activeRightDockPanel !== 'none') {
    workspaceState.recentRightDockPanel = workspaceState.activeRightDockPanel as Exclude<WorkspaceDockPanel, 'none'>
    workspaceState.activeRightDockPanel = 'none'
    workspaceState.rightPanelVisible = false
  }
}

export function reopenRecentDockPanel(placement: Exclude<PanelPlacement, 'sidebar' | 'floating'> = 'bottom') {
  if (placement === 'right') openDockPanel(workspaceState.recentRightDockPanel, 'right')
  else openDockPanel(workspaceState.recentBottomDockPanel, 'bottom')
}

export function openLogsPanel() {
  openDockPanel('logs', 'bottom')
}

export function closeLogsPanel() {
  closeDockPanel()
}
