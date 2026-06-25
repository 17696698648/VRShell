import {
  mainAreaModes,
  panelPlacements,
  workspaceDockPanels,
  workspaceDensities,
  workspaceLayoutPresets,
  workspaceMainViews,
  workspacePanels,
  type WorkspaceDockPanel,
  type WorkspaceLayoutState,
} from './workspace.types'

const defaultLayout: WorkspaceLayoutState = {
  activeBottomDockPanel: 'logs',
  activeRightDockPanel: 'terminal-info',
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
  panelPlacement: 'bottom',
  recentBottomDockPanel: 'logs',
  recentRightDockPanel: 'terminal-info',
  rightDockWidth: 340,
  rightPanelVisible: false,
  sidebarVisible: true,
  sidebarWidth: 280,
}

export function getDefaultWorkspaceLayout(): WorkspaceLayoutState {
  return {...defaultLayout}
}

export function normalizeWorkspaceLayout(input: Partial<WorkspaceLayoutState> | null | undefined): WorkspaceLayoutState {
  const {activeBottom, activeRight, recentBottom, recentRight} = normalizeDockPanels(input)
  return {
    activeBottomDockPanel: activeBottom,
    activeRightDockPanel: activeRight,
    activeMainView: isOneOf(input?.activeMainView, workspaceMainViews) ? input.activeMainView : defaultLayout.activeMainView,
    activePanel: isOneOf(input?.activePanel, workspacePanels) ? input.activePanel : defaultLayout.activePanel,
    bottomPanelHeight: clampNumber(input?.bottomPanelHeight, 160, 520, defaultLayout.bottomPanelHeight),
    bottomPanelVisible: normalizeBottomVisibility(input?.bottomPanelVisible, activeBottom),
    compactMode: typeof input?.compactMode === 'boolean' ? input.compactMode : defaultLayout.compactMode,
    density: isOneOf(input?.density, workspaceDensities) ? input.density : defaultLayout.density,
    dockOrder: Array.isArray(input?.dockOrder) ? input.dockOrder.filter((panel) => isOneOf(panel, workspaceDockPanels)) : defaultLayout.dockOrder,
    layoutPreset: isOneOf(input?.layoutPreset, workspaceLayoutPresets) ? input.layoutPreset : defaultLayout.layoutPreset,
    mainAreaMode: isOneOf(input?.mainAreaMode, mainAreaModes) ? input.mainAreaMode : defaultLayout.mainAreaMode,
    mainSplitRatio: clampNumber(input?.mainSplitRatio, 30, 75, defaultLayout.mainSplitRatio),
    panelPlacement: normalizePanelPlacement(input?.panelPlacement),
    recentBottomDockPanel: recentBottom,
    recentRightDockPanel: recentRight,
    rightDockWidth: clampNumber(input?.rightDockWidth, 260, 520, defaultLayout.rightDockWidth),
    rightPanelVisible: normalizeRightVisibility(input?.rightPanelVisible, activeRight),
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

function normalizeDockPanels(input: Partial<WorkspaceLayoutState> | null | undefined) {
  const bottomPanels: WorkspaceDockPanel[] = ['logs', 'problems', 'output']
  const rightPanels: WorkspaceDockPanel[] = ['session-detail', 'sftp-item-detail', 'task-detail', 'terminal-info']
  const legacyPanel = (input as Record<string, unknown>)?.activeDockPanel
  const legacyRecent = (input as Record<string, unknown>)?.recentDockPanel
  const legacyPlacement = input?.panelPlacement

  let activeBottom = defaultLayout.activeBottomDockPanel
  let activeRight = defaultLayout.activeRightDockPanel
  let recentBottom = defaultLayout.recentBottomDockPanel
  let recentRight = defaultLayout.recentRightDockPanel

  if (typeof legacyPanel === 'string' && workspaceDockPanels.includes(legacyPanel as never) && legacyPanel !== 'none') {
    if (legacyPlacement === 'right' || rightPanels.includes(legacyPanel as never)) {
      activeRight = legacyPanel as WorkspaceDockPanel
    } else {
      activeBottom = legacyPanel as WorkspaceDockPanel
    }
  }
  if (typeof input?.activeBottomDockPanel === 'string' && workspaceDockPanels.includes(input.activeBottomDockPanel as never)) {
    activeBottom = input.activeBottomDockPanel
  }
  if (typeof input?.activeRightDockPanel === 'string' && workspaceDockPanels.includes(input.activeRightDockPanel as never)) {
    activeRight = input.activeRightDockPanel
  }
  if (typeof legacyRecent === 'string' && workspaceDockPanels.includes(legacyRecent as never) && legacyRecent !== 'none') {
    if (rightPanels.includes(legacyRecent as never)) recentRight = legacyRecent as Exclude<WorkspaceDockPanel, 'none'>
    else recentBottom = legacyRecent as Exclude<WorkspaceDockPanel, 'none'>
  }
  if (typeof input?.recentBottomDockPanel === 'string' && workspaceDockPanels.includes(input.recentBottomDockPanel as never)) {
    recentBottom = input.recentBottomDockPanel as Exclude<WorkspaceDockPanel, 'none'>
  }
  if (typeof input?.recentRightDockPanel === 'string' && workspaceDockPanels.includes(input.recentRightDockPanel as never)) {
    recentRight = input.recentRightDockPanel as Exclude<WorkspaceDockPanel, 'none'>
  }
  return {activeBottom, activeRight, recentBottom, recentRight}
}

function normalizeBottomVisibility(value: unknown, activePanel: WorkspaceDockPanel): boolean {
  if (activePanel !== 'none') return true
  return typeof value === 'boolean' ? value : defaultLayout.bottomPanelVisible
}

function normalizeRightVisibility(value: unknown, activePanel: WorkspaceDockPanel): boolean {
  if (activePanel !== 'none') return typeof value === 'boolean' ? value : defaultLayout.rightPanelVisible
  return false
}

function normalizePanelPlacement(value: unknown): WorkspaceLayoutState['panelPlacement'] {
  if (value === 'sidebar') return 'right'
  return isOneOf(value, panelPlacements) ? value : defaultLayout.panelPlacement
}
