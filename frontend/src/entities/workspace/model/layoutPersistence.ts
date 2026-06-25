import {
  mainAreaModes,
  panelPlacements,
  workspaceDockPanels,
  workspaceDensities,
  workspaceLayoutPresets,
  workspaceMainViews,
  workspacePanels,
  type WorkspaceLayoutState,
} from './workspace.types'

const defaultLayout: WorkspaceLayoutState = {
  activeDockPanel: 'terminal-info',
  activeMainView: 'terminal',
  activePanel: 'sessions',
  bottomPanelHeight: 220,
  bottomPanelVisible: true,
  compactMode: false,
  density: 'compact',
  dockOrder: ['problems', 'output', 'logs', 'task-detail', 'session-detail', 'sftp-item-detail', 'terminal-info'],
  layoutPreset: 'operations',
  mainAreaMode: 'single',
  mainSplitRatio: 62,
  panelPlacement: 'right',
  recentDockPanel: 'terminal-info',
  rightDockWidth: 340,
  sidebarVisible: true,
  sidebarWidth: 280,
}

export function getDefaultWorkspaceLayout(): WorkspaceLayoutState {
  return {...defaultLayout}
}

export function normalizeWorkspaceLayout(input: Partial<WorkspaceLayoutState> | null | undefined): WorkspaceLayoutState {
  const activeDockPanel = normalizeActiveDockPanel(input?.activeDockPanel)
  return {
    activeDockPanel,
    activeMainView: isOneOf(input?.activeMainView, workspaceMainViews) ? input.activeMainView : defaultLayout.activeMainView,
    activePanel: isOneOf(input?.activePanel, workspacePanels) ? input.activePanel : defaultLayout.activePanel,
    bottomPanelHeight: clampNumber(input?.bottomPanelHeight, 160, 520, defaultLayout.bottomPanelHeight),
    bottomPanelVisible: normalizeDockVisibility(input?.bottomPanelVisible, activeDockPanel),
    compactMode: typeof input?.compactMode === 'boolean' ? input.compactMode : defaultLayout.compactMode,
    density: isOneOf(input?.density, workspaceDensities) ? input.density : defaultLayout.density,
    dockOrder: Array.isArray(input?.dockOrder) ? input.dockOrder.filter((panel) => isOneOf(panel, workspaceDockPanels)) : defaultLayout.dockOrder,
    layoutPreset: isOneOf(input?.layoutPreset, workspaceLayoutPresets) ? input.layoutPreset : defaultLayout.layoutPreset,
    mainAreaMode: isOneOf(input?.mainAreaMode, mainAreaModes) ? input.mainAreaMode : defaultLayout.mainAreaMode,
    mainSplitRatio: clampNumber(input?.mainSplitRatio, 30, 75, defaultLayout.mainSplitRatio),
    panelPlacement: normalizePanelPlacement(input?.panelPlacement),
    recentDockPanel: normalizeRecentDockPanel(input?.recentDockPanel),
    rightDockWidth: clampNumber(input?.rightDockWidth, 260, 520, defaultLayout.rightDockWidth),
    sidebarVisible: typeof input?.sidebarVisible === 'boolean' ? input.sidebarVisible : defaultLayout.sidebarVisible,
    sidebarWidth: clampNumber(input?.sidebarWidth, 220, 420, defaultLayout.sidebarWidth),
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function isOneOf<const T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && allowed.includes(value)
}

function normalizeActiveDockPanel(value: unknown): WorkspaceLayoutState['activeDockPanel'] {
  return isOneOf(value, workspaceDockPanels) ? value : defaultLayout.activeDockPanel
}

function normalizeDockVisibility(value: unknown, activeDockPanel: WorkspaceLayoutState['activeDockPanel']) {
  if (activeDockPanel !== 'none') return true
  return typeof value === 'boolean' ? value : defaultLayout.bottomPanelVisible
}

function normalizeRecentDockPanel(value: unknown): Exclude<(typeof workspaceDockPanels)[number], 'none'> {
  if (typeof value === 'string' && value !== 'none' && workspaceDockPanels.includes(value as never)) return value as Exclude<(typeof workspaceDockPanels)[number], 'none'>
  return defaultLayout.recentDockPanel
}

function normalizePanelPlacement(value: unknown): WorkspaceLayoutState['panelPlacement'] {
  if (value === 'sidebar') return 'right'
  return isOneOf(value, panelPlacements) ? value : defaultLayout.panelPlacement
}
