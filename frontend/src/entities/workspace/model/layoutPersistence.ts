import {
  mainAreaModes,
  panelPlacements,
  workspaceDockPanels,
  workspaceDensities,
  workspaceLayoutPresets,
  workspaceMainViews,
  workspacePanels,
  workspaceRightPanels,
  type WorkspaceDockPanel,
  type WorkspaceLayoutState,
  type WorkspaceRightPanel,
} from './workspace.types'

const defaultLayout: WorkspaceLayoutState = {
  activeBottomDockPanel: 'logs',
  activeMainView: 'terminal',
  activePanel: 'sessions',
  activeRightPanel: 'connection-info',
  bottomPanelHeight: 220,
  bottomPanelVisible: true,
  compactMode: false,
  density: 'compact',
  dockOrder: ['logs', 'tasks'],
  layoutPreset: 'operations',
  mainAreaMode: 'single',
  mainSplitRatio: 62,
  panelPlacement: 'bottom',
  recentBottomDockPanel: 'logs',
  recentRightPanel: 'connection-info',
  rightPanelVisible: true,
  rightPanelWidth: 280,
  sidebarVisible: true,
  sidebarWidth: 280,
}

export function getDefaultWorkspaceLayout(): WorkspaceLayoutState {
  return {...defaultLayout}
}

export function normalizeWorkspaceLayout(input: Partial<WorkspaceLayoutState> | null | undefined): WorkspaceLayoutState {
  const {activeBottom, recentBottom} = normalizeDockPanels(input)
  const legacyActivePanel = (input as Record<string, unknown> | null | undefined)?.activePanel
  const legacySftpPanel = legacyActivePanel === 'sftp'
  const legacyTasksPanel = legacyActivePanel === 'tasks'
  return {
    activeBottomDockPanel: legacyTasksPanel ? 'tasks' : activeBottom,
    activeMainView: isOneOf(input?.activeMainView, workspaceMainViews) ? input.activeMainView : defaultLayout.activeMainView,
    activePanel: legacySftpPanel || legacyTasksPanel ? 'sessions' : isOneOf(input?.activePanel, workspacePanels) ? input.activePanel : defaultLayout.activePanel,
    activeRightPanel: legacySftpPanel ? 'sftp' : isOneOf(input?.activeRightPanel, workspaceRightPanels) ? input.activeRightPanel : defaultLayout.activeRightPanel,
    bottomPanelHeight: clampNumber(input?.bottomPanelHeight, 160, 520, defaultLayout.bottomPanelHeight),
    bottomPanelVisible: legacyTasksPanel ? true : normalizeBottomVisibility(input?.bottomPanelVisible, activeBottom),
    compactMode: typeof input?.compactMode === 'boolean' ? input.compactMode : defaultLayout.compactMode,
    density: isOneOf(input?.density, workspaceDensities) ? input.density : defaultLayout.density,
    dockOrder: Array.isArray(input?.dockOrder) ? input.dockOrder.filter((panel) => isOneOf(panel, workspaceDockPanels)) : defaultLayout.dockOrder,
    layoutPreset: isOneOf(input?.layoutPreset, workspaceLayoutPresets) ? input.layoutPreset : defaultLayout.layoutPreset,
    mainAreaMode: isOneOf(input?.mainAreaMode, mainAreaModes) ? input.mainAreaMode : defaultLayout.mainAreaMode,
    mainSplitRatio: clampNumber(input?.mainSplitRatio, 30, 75, defaultLayout.mainSplitRatio),
    panelPlacement: normalizePanelPlacement(input?.panelPlacement),
    recentBottomDockPanel: legacyTasksPanel ? 'tasks' : recentBottom,
    recentRightPanel: legacySftpPanel ? 'sftp' : isOneOf(input?.recentRightPanel, workspaceRightPanels) ? input.recentRightPanel : defaultLayout.recentRightPanel,
    rightPanelVisible: legacySftpPanel ? true : typeof input?.rightPanelVisible === 'boolean' ? input.rightPanelVisible : defaultLayout.rightPanelVisible,
    rightPanelWidth: clampNumber(input?.rightPanelWidth, 220, 420, defaultLayout.rightPanelWidth),
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
  const removedPanels = ['problems', 'output', 'session-detail', 'sftp-item-detail', 'task-detail', 'terminal-info']
  const legacyPanel = (input as Record<string, unknown>)?.activeDockPanel
  const legacyRecent = (input as Record<string, unknown>)?.recentDockPanel

  let activeBottom = defaultLayout.activeBottomDockPanel
  let recentBottom = defaultLayout.recentBottomDockPanel

  if (typeof legacyPanel === 'string' && legacyPanel !== 'none') {
    if (removedPanels.includes(legacyPanel)) {
      activeBottom = 'logs'
    } else if (workspaceDockPanels.includes(legacyPanel as never)) {
      activeBottom = legacyPanel as WorkspaceDockPanel
    }
  }
  if (typeof input?.activeBottomDockPanel === 'string' && workspaceDockPanels.includes(input.activeBottomDockPanel as never)) {
    activeBottom = input.activeBottomDockPanel
  }
  if (typeof legacyRecent === 'string' && legacyRecent !== 'none') {
    if (removedPanels.includes(legacyRecent)) recentBottom = 'logs'
    else if (workspaceDockPanels.includes(legacyRecent as never)) recentBottom = legacyRecent as Exclude<WorkspaceDockPanel, 'none'>
  }
  if (typeof input?.recentBottomDockPanel === 'string' && workspaceDockPanels.includes(input.recentBottomDockPanel as never)) {
    recentBottom = input.recentBottomDockPanel as Exclude<WorkspaceDockPanel, 'none'>
  }
  return {activeBottom, recentBottom}
}

function normalizeBottomVisibility(value: unknown, activePanel: WorkspaceDockPanel): boolean {
  if (activePanel !== 'none') return true
  return typeof value === 'boolean' ? value : defaultLayout.bottomPanelVisible
}

function normalizePanelPlacement(value: unknown): WorkspaceLayoutState['panelPlacement'] {
  if (value === 'sidebar') return 'right'
  return isOneOf(value, panelPlacements) ? value : defaultLayout.panelPlacement
}
