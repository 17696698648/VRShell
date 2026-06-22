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

export function setDockPlacement(placement: Exclude<PanelPlacement, 'sidebar' | 'floating'>) {
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

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}
