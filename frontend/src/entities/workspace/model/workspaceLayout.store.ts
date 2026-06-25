import {getDefaultWorkspaceLayout} from './layoutPersistence'
import {workspaceState} from './workspace.store'
import type {PanelPlacement, WorkspaceLayoutPreset} from './workspace.types'

export function setSidebarWidth(width: number) {
  workspaceState.sidebarWidth = clamp(width, 220, 420)
}

export function setBottomPanelHeight(height: number) {
  workspaceState.bottomPanelHeight = clamp(height, 160, 520)
}

export function setRightDockWidth(width: number) {
  workspaceState.rightDockWidth = clamp(width, 260, 520)
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
  workspaceState.rightPanelVisible = false
  workspaceState.activeBottomDockPanel = 'none'
  workspaceState.activeRightDockPanel = 'none'
  if (preset === 'development') {
    workspaceState.activePanel = 'sessions'
    workspaceState.mainAreaMode = 'vertical-split'
    workspaceState.mainSplitRatio = 58
    workspaceState.activeRightDockPanel = 'session-detail'
    workspaceState.rightPanelVisible = true
    return
  }
  if (preset === 'file-transfer') {
    workspaceState.activePanel = 'sftp'
    workspaceState.mainAreaMode = 'horizontal-split'
    workspaceState.mainSplitRatio = 52
    workspaceState.activeRightDockPanel = 'sftp-item-detail'
    workspaceState.rightPanelVisible = true
    return
  }
  if (preset === 'monitoring') {
    workspaceState.activePanel = 'tasks'
    workspaceState.mainAreaMode = 'single'
    workspaceState.mainSplitRatio = 68
    workspaceState.activeBottomDockPanel = 'problems'
    workspaceState.bottomPanelVisible = true
    return
  }
  workspaceState.activePanel = 'sessions'
  workspaceState.mainAreaMode = 'horizontal-split'
  workspaceState.mainSplitRatio = 62
  workspaceState.activeBottomDockPanel = 'logs'
  workspaceState.bottomPanelVisible = true
}

export function setDockPlacement(placement: Exclude<PanelPlacement, 'sidebar' | 'floating'>) {
  const bottomPanels = ['logs', 'problems', 'output']
  const currentBottom = workspaceState.activeBottomDockPanel
  const currentRight = workspaceState.activeRightDockPanel
  if (placement === 'right' && currentBottom !== 'none' && !bottomPanels.includes(currentBottom)) {
    workspaceState.activeRightDockPanel = currentBottom
    workspaceState.activeBottomDockPanel = 'none'
    workspaceState.bottomPanelVisible = false
    workspaceState.rightPanelVisible = true
  } else if (placement === 'bottom' && currentRight !== 'none' && bottomPanels.includes(currentRight)) {
    workspaceState.activeBottomDockPanel = currentRight
    workspaceState.activeRightDockPanel = 'none'
    workspaceState.rightPanelVisible = false
    workspaceState.bottomPanelVisible = true
  }
  workspaceState.panelPlacement = placement
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
