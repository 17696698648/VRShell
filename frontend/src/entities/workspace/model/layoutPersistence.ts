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
  activeDockPanel: 'none',
  activeMainView: 'workbench',
  activePanel: 'sessions',
  bottomPanelHeight: 220,
  bottomPanelVisible: false,
  compactMode: false,
  density: 'compact',
  layoutPreset: 'operations',
  mainAreaMode: 'horizontal-split',
  mainSplitRatio: 62,
  panelPlacement: 'sidebar',
  rightDockWidth: 340,
  sidebarVisible: true,
  sidebarWidth: 280,
}

export function getDefaultWorkspaceLayout(): WorkspaceLayoutState {
  return {...defaultLayout}
}

export function normalizeWorkspaceLayout(input: Partial<WorkspaceLayoutState> | null | undefined): WorkspaceLayoutState {
  return {
    activeDockPanel: isOneOf(input?.activeDockPanel, workspaceDockPanels) ? input.activeDockPanel : defaultLayout.activeDockPanel,
    activeMainView: isOneOf(input?.activeMainView, workspaceMainViews) ? input.activeMainView : defaultLayout.activeMainView,
    activePanel: isOneOf(input?.activePanel, workspacePanels) ? input.activePanel : defaultLayout.activePanel,
    bottomPanelHeight: clampNumber(input?.bottomPanelHeight, 160, 520, defaultLayout.bottomPanelHeight),
    bottomPanelVisible: typeof input?.bottomPanelVisible === 'boolean' ? input.bottomPanelVisible : defaultLayout.bottomPanelVisible,
    compactMode: typeof input?.compactMode === 'boolean' ? input.compactMode : defaultLayout.compactMode,
    density: isOneOf(input?.density, workspaceDensities) ? input.density : defaultLayout.density,
    layoutPreset: isOneOf(input?.layoutPreset, workspaceLayoutPresets) ? input.layoutPreset : defaultLayout.layoutPreset,
    mainAreaMode: isOneOf(input?.mainAreaMode, mainAreaModes) ? input.mainAreaMode : defaultLayout.mainAreaMode,
    mainSplitRatio: clampNumber(input?.mainSplitRatio, 30, 75, defaultLayout.mainSplitRatio),
    panelPlacement: isOneOf(input?.panelPlacement, panelPlacements) ? input.panelPlacement : defaultLayout.panelPlacement,
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
