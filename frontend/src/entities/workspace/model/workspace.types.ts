export const workspacePanels = ['sessions', 'sftp', 'tasks', 'search', 'settings'] as const
export const workspaceThemes = ['dark', 'light', 'high-contrast'] as const
export const workspaceDensities = ['compact', 'comfortable', 'dense'] as const
export const mainAreaModes = ['single', 'horizontal-split', 'vertical-split'] as const
export const workspaceLayoutPresets = ['development', 'operations', 'file-transfer', 'monitoring'] as const
export const panelPlacements = ['sidebar', 'right', 'bottom', 'floating'] as const
export const workspaceMainViews = ['workbench', 'settings'] as const
export const workspaceDockPanels = ['none', 'logs', 'problems', 'output', 'session-detail', 'sftp-item-detail'] as const

export type WorkspacePanel = (typeof workspacePanels)[number]
export type WorkspaceTheme = (typeof workspaceThemes)[number]
export type WorkspaceDensity = (typeof workspaceDensities)[number]
export type MainAreaMode = (typeof mainAreaModes)[number]
export type WorkspaceLayoutPreset = (typeof workspaceLayoutPresets)[number]
export type PanelPlacement = (typeof panelPlacements)[number]
export type WorkspaceMainView = (typeof workspaceMainViews)[number]
export type WorkspaceDockPanel = (typeof workspaceDockPanels)[number]

export interface WorkspaceLayoutState {
  sidebarVisible: boolean
  sidebarWidth: number
  activePanel: WorkspacePanel
  activeMainView: WorkspaceMainView
  activeDockPanel: WorkspaceDockPanel
  bottomPanelVisible: boolean
  bottomPanelHeight: number
  rightDockWidth: number
  mainSplitRatio: number
  compactMode: boolean
  mainAreaMode: MainAreaMode
  density: WorkspaceDensity
  layoutPreset: WorkspaceLayoutPreset
  panelPlacement: PanelPlacement
}
