import type {SessionGroup, SessionHost} from '../../entities/session'
import {sessionState} from '../../entities/session'
import {normalizeWorkspaceLayout, workspaceState, type WorkspaceLayoutState, type WorkspacePanel, type WorkspaceTheme} from '../../entities/workspace'
import {isThemeName} from '../../shared/theme/theme.types'

const storageKey = 'vrshell-ui-state-v1'
const currentVersion = 3

type PersistedState = PersistedStateV1 | PersistedStateV2 | PersistedStateV3

interface PersistedStateV1 {
  version: 1
  sessions: SessionHost[]
  groups: SessionGroup[]
  activeSessionId: string
  activePanel: WorkspacePanel
  theme: WorkspaceTheme
}

interface PersistedStateV2 extends Omit<PersistedStateV1, 'version'> {
  version: 2
}

interface PersistedStateV3 extends Omit<PersistedStateV1, 'version' | 'activePanel'> {
  version: 3
  workspaceLayout: WorkspaceLayoutState
}

export function restorePersistedState() {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return
  try {
    const state = migratePersistedState(JSON.parse(raw))
    if (!state) {
      localStorage.removeItem(storageKey)
      return
    }
    sessionState.sessions.splice(0, sessionState.sessions.length, ...state.sessions)
    sessionState.groups.splice(0, sessionState.groups.length, ...state.groups)
    sessionState.activeSessionId = state.sessions.some((session) => session.id === state.activeSessionId) ? state.activeSessionId : state.sessions[0]?.id ?? ''
    applyWorkspaceLayout(state.workspaceLayout)
    workspaceState.theme = state.theme
    localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    localStorage.removeItem(storageKey)
  }
}

export function persistState() {
  const state: PersistedStateV3 = {
    version: currentVersion,
    sessions: sessionState.sessions,
    groups: sessionState.groups,
    activeSessionId: sessionState.activeSessionId,
    workspaceLayout: snapshotWorkspaceLayout(),
    theme: workspaceState.theme,
  }
  localStorage.setItem(storageKey, JSON.stringify(state))
}

export function migratePersistedState(input: unknown): PersistedStateV3 | null {
  if (!isPersistedState(input)) return null
  if (input.version === 1 || input.version === 2) {
    return normalizeState({...input, version: currentVersion, workspaceLayout: normalizeWorkspaceLayout({activePanel: input.activePanel})})
  }
  if (input.version === currentVersion) return normalizeState(input)
  return null
}

function normalizeState(state: PersistedStateV3): PersistedStateV3 {
  const sessions = state.sessions.map(normalizeSession).filter((session): session is SessionHost => session !== null)
  const sessionIds = new Set(sessions.map((session) => session.id))
  const groups = state.groups.map((group) => normalizeGroup(group, sessionIds)).filter((group): group is SessionGroup => group !== null)
  const knownGroupIds = new Set(groups.map((group) => group.id))

  for (const session of sessions) {
    if (!knownGroupIds.has(session.groupId)) {
      const fallbackGroup = groups[0] ?? {id: 'ungrouped', name: 'Ungrouped', sessionIds: []}
      if (groups.length === 0) groups.push(fallbackGroup)
      session.groupId = fallbackGroup.id
      if (!fallbackGroup.sessionIds.includes(session.id)) fallbackGroup.sessionIds.push(session.id)
    }
  }

  return {
    ...state,
    sessions,
    groups,
    workspaceLayout: normalizeWorkspaceLayout(state.workspaceLayout),
    theme: isThemeName(state.theme) ? state.theme : 'dark',
  }
}

function normalizeSession(session: SessionHost): SessionHost | null {
  if (!session.id || !session.name || !session.host || !session.username) return null
  return {
    ...session,
    port: Number.isInteger(session.port) && session.port > 0 && session.port <= 65535 ? session.port : 22,
    protocol: session.protocol ?? 'ssh',
    status: ['idle', 'connecting', 'connected', 'failed'].includes(session.status) ? session.status : 'idle',
    tags: Array.isArray(session.tags) ? session.tags : [],
  }
}

function normalizeGroup(group: SessionGroup, sessionIds: Set<string>): SessionGroup | null {
  if (!group.id || !group.name) return null
  return {
    id: group.id,
    name: group.name,
    sessionIds: Array.isArray(group.sessionIds) ? group.sessionIds.filter((id) => sessionIds.has(id)) : [],
  }
}

function snapshotWorkspaceLayout(): WorkspaceLayoutState {
  return normalizeWorkspaceLayout({
    activePanel: workspaceState.activePanel,
    bottomPanelHeight: workspaceState.bottomPanelHeight,
    bottomPanelVisible: workspaceState.bottomPanelVisible,
    density: workspaceState.density,
    mainAreaMode: workspaceState.mainAreaMode,
    sidebarVisible: workspaceState.sidebarVisible,
    sidebarWidth: workspaceState.sidebarWidth,
  })
}

function applyWorkspaceLayout(layout: WorkspaceLayoutState) {
  workspaceState.activePanel = layout.activePanel
  workspaceState.bottomPanelHeight = layout.bottomPanelHeight
  workspaceState.bottomPanelVisible = layout.bottomPanelVisible
  workspaceState.density = layout.density
  workspaceState.mainAreaMode = layout.mainAreaMode
  workspaceState.sidebarVisible = layout.sidebarVisible
  workspaceState.sidebarWidth = layout.sidebarWidth
}

function isPersistedState(input: unknown): input is PersistedState {
  if (!input || typeof input !== 'object') return false
  const state = input as Partial<PersistedState>
  return (state.version === 1 || state.version === 2 || state.version === currentVersion) && Array.isArray(state.sessions) && Array.isArray(state.groups)
}
