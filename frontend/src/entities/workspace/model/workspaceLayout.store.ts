import {getDefaultWorkspaceLayout} from './layoutPersistence'
import {workspaceState} from './workspace.store'
import type {PanelPlacement, WorkspaceLayoutPreset, WorkspaceRightPanel} from './workspace.types'

export function setSidebarWidth(width: number) {
  workspaceState.sidebarWidth = clamp(width, 220, 420)
}

export function setRightPanelWidth(width: number) {
  workspaceState.rightPanelWidth = clamp(width, 220, 420)
}

export function toggleRightPanel() {
  workspaceState.rightPanelVisible = !workspaceState.rightPanelVisible
}

export function switchRightPanel(panel: WorkspaceRightPanel) {
  if (workspaceState.activeRightPanel === panel && workspaceState.rightPanelVisible) {
    workspaceState.rightPanelVisible = false
    return
  }
  workspaceState.activeRightPanel = panel
  workspaceState.recentRightPanel = panel
  workspaceState.rightPanelVisible = true
}

export function setBottomPanelHeight(height: number) {
  workspaceState.bottomPanelHeight = clamp(height, 160, 520)
}

export function setMainSplitRatio(ratio: number) {
  workspaceState.mainSplitRatio = clamp(ratio, 30, 75)
}

export function setLayoutPreset(preset: WorkspaceLayoutPreset) {
  workspaceState.layoutPreset = preset
}

export function applyLayoutPreset(preset: WorkspaceLayoutPreset) {
  workspaceState.layoutPreset = preset
  workspaceState.compactMode = false
  workspaceState.bottomPanelVisible = false
  workspaceState.activeBottomDockPanel = 'none'
  if (preset === 'development') {
    workspaceState.activePanel = 'sessions'
    workspaceState.mainAreaMode = 'vertical-split'
    workspaceState.mainSplitRatio = 58
    return
  }
  if (preset === 'file-transfer') {
    workspaceState.activePanel = 'sessions'
    workspaceState.activeRightPanel = 'sftp'
    workspaceState.recentRightPanel = 'sftp'
    workspaceState.rightPanelVisible = true
    workspaceState.mainAreaMode = 'horizontal-split'
    workspaceState.mainSplitRatio = 52
    return
  }
  if (preset === 'monitoring') {
    workspaceState.activePanel = 'tasks'
    workspaceState.mainAreaMode = 'single'
    workspaceState.mainSplitRatio = 68
    workspaceState.activeBottomDockPanel = 'logs'
    workspaceState.bottomPanelVisible = true
    return
  }
  workspaceState.activePanel = 'sessions'
  workspaceState.mainAreaMode = 'horizontal-split'
  workspaceState.mainSplitRatio = 62
  workspaceState.activeBottomDockPanel = 'logs'
  workspaceState.bottomPanelVisible = true
}

export function setCompactMode(enabled: boolean) {
  workspaceState.compactMode = enabled
}

export function resetWorkspaceLayout() {
  Object.assign(workspaceState, getDefaultWorkspaceLayout())
}

export function toggleMaximizeMainArea() {
  workspaceState.compactMode = !workspaceState.compactMode
}

export function reorderDockPanels(sourceId: string, targetId: string) {
  const sourceIndex = workspaceState.dockOrder.indexOf(sourceId as never)
  const targetIndex = workspaceState.dockOrder.indexOf(targetId as never)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return
  const [panel] = workspaceState.dockOrder.splice(sourceIndex, 1)
  workspaceState.dockOrder.splice(targetIndex, 0, panel)
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}
