export const workspacePanels = ['sessions', 'tasks', 'settings'] as const
export const workspaceRightPanels = ['connection-info', 'sftp'] as const
export const workspaceThemes = ['system', 'dark', 'light', 'high-contrast'] as const
export const workspaceDensities = ['compact', 'comfortable', 'dense'] as const
export const mainAreaModes = ['single', 'horizontal-split', 'vertical-split'] as const
export const workspaceLayoutPresets = ['development', 'operations', 'file-transfer', 'monitoring'] as const
export const panelPlacements = ['sidebar', 'right', 'bottom', 'floating'] as const
export const workspaceMainViews = ['welcome', 'terminal', 'editor', 'settings'] as const
export const workspaceDockPanels = ['none', 'logs'] as const

export type WorkspacePanel = (typeof workspacePanels)[number]
export type WorkspaceRightPanel = (typeof workspaceRightPanels)[number]
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
  rightPanelVisible: boolean
  rightPanelWidth: number
  activeRightPanel: WorkspaceRightPanel
  recentRightPanel: WorkspaceRightPanel
  activeMainView: WorkspaceMainView
  activeBottomDockPanel: WorkspaceDockPanel
  recentBottomDockPanel: Exclude<WorkspaceDockPanel, 'none'>
  bottomPanelVisible: boolean
  bottomPanelHeight: number
  mainSplitRatio: number
  compactMode: boolean
  mainAreaMode: MainAreaMode
  density: WorkspaceDensity
  layoutPreset: WorkspaceLayoutPreset
  panelPlacement: PanelPlacement
  dockOrder: WorkspaceDockPanel[]
}
