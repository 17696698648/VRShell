import type {SessionGroup, SessionHost} from '../../entities/session'
import {sessionState} from '../../entities/session'
import {normalizeWorkspaceLayout, workspaceState, type WorkspaceLayoutState, type WorkspacePanel, type WorkspaceTheme} from '../../entities/workspace'
import {notifyWarning} from '../../shared/feedback'
import {isThemeName} from '../../shared/theme/theme.types'

const storageKey = 'vrshell-ui-state-v1'
const backupStorageKey = `${storageKey}:migration-backup`
const currentVersion = 6
const currentSubstateVersions = {
  openPanes: 1,
  sessionTree: 1,
  sftp: 1,
  workspaceLayout: 1,
}

type PersistedState = PersistedStateV1 | PersistedStateV2 | PersistedStateV3 | PersistedStateV4 | PersistedStateV5 | PersistedStateV6
type PersistedEnvelope = PersistedEnvelopeV6
interface PersistedEnvelopeV6 {
  schemaVersion: 6
  savedAt: string
  data: PersistedStateV6
}

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

interface PersistedStateV4 extends Omit<PersistedStateV3, 'version'> {
  version: 4
}

interface PersistedStateV5 extends Omit<PersistedStateV3, 'version'> {
  version: 5
}

interface PersistedStateV6 extends Omit<PersistedStateV5, 'version'> {
  version: 6
  substateVersions: typeof currentSubstateVersions
}

export function restorePersistedState() {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return
  try {
    const envelope = migratePersistedState(JSON.parse(raw))
    if (!envelope) {
      backupMigrationSource(raw)
      notifyWorkspaceRecovered('Saved workspace data is not supported by this version. VRShell started with safe defaults and kept a backup.')
      return
    }
    const state = envelope.data
    sessionState.sessions.splice(0, sessionState.sessions.length, ...state.sessions)
    sessionState.groups.splice(0, sessionState.groups.length, ...state.groups)
    sessionState.activeSessionId = state.sessions.some((session) => session.id === state.activeSessionId) ? state.activeSessionId : state.sessions[0]?.id ?? ''
    applyWorkspaceLayout(normalizeStartupWorkspaceLayout(state.workspaceLayout))
    workspaceState.theme = state.theme
    if (raw !== JSON.stringify(envelope)) backupMigrationSource(raw)
    localStorage.setItem(storageKey, JSON.stringify(envelope))
  } catch {
    backupMigrationSource(raw)
    notifyWorkspaceRecovered('Saved workspace data could not be read. VRShell started with safe defaults and kept a backup.')
  }
}

export function persistState() {
  localStorage.setItem(storageKey, JSON.stringify(createEnvelope(snapshotPersistedData())))
}

export function migratePersistedState(input: unknown): PersistedEnvelope | null {
  if (isPersistedEnvelope(input)) return createEnvelope(normalizeState(input.data), input.savedAt)
  if (!isPersistedState(input)) return null
  if (input.version === 1 || input.version === 2) return createEnvelope(normalizeState(createStateFromLegacy(input, normalizeStartupWorkspaceLayout({activePanel: input.activePanel}), input.theme)))
  if (input.version === 3 || input.version === 4) return createEnvelope(normalizeState(createStateFromLegacy(input, normalizeStartupWorkspaceLayout(input.workspaceLayout), input.theme)))
  if (input.version === 5 || input.version === currentVersion) return createEnvelope(normalizeState(input))
  return null
}

function snapshotPersistedData(): PersistedStateV6 {
  return {
    version: currentVersion,
    substateVersions: currentSubstateVersions,
    sessions: sessionState.sessions.map(scrubSession),
    groups: sessionState.groups,
    activeSessionId: sessionState.activeSessionId,
    workspaceLayout: snapshotWorkspaceLayout(),
    theme: workspaceState.theme,
  }
}

function createEnvelope(data: PersistedStateV6, savedAt = new Date().toISOString()): PersistedEnvelope {
  return {
    schemaVersion: currentVersion,
    savedAt,
    data,
  }
}

function backupMigrationSource(raw: string) {
  localStorage.setItem(backupStorageKey, raw)
}

function notifyWorkspaceRecovered(detail: string) {
  notifyWarning({title: 'Workspace layout recovered', detail, dedupeKey: 'workspace:persistence:recovered', timeoutMs: null})
}

function createStateFromLegacy(state: PersistedState, workspaceLayout: WorkspaceLayoutState, theme: WorkspaceTheme): PersistedStateV6 {
  return {
    version: currentVersion,
    substateVersions: currentSubstateVersions,
    sessions: Array.isArray(state.sessions) ? state.sessions : [],
    groups: Array.isArray(state.groups) ? state.groups : [{id: 'all', name: '所有', sessionIds: []}],
    activeSessionId: typeof state.activeSessionId === 'string' ? state.activeSessionId : '',
    workspaceLayout,
    theme,
  }
}

function normalizeState(state: PersistedStateV5 | PersistedStateV6): PersistedStateV6 {
  const sessions = state.sessions.map(normalizeSession).filter((session): session is SessionHost => session !== null).map(scrubSession)
  const sessionIds = new Set(sessions.map((session) => session.id))
  const groups = ensureRootGroup(state.groups.map((group) => normalizeGroup(group, sessionIds)).filter((group): group is SessionGroup => group !== null))
  const knownGroupIds = new Set(groups.map((group) => group.id))

  for (const session of sessions) {
    if (!knownGroupIds.has(session.groupId)) {
      const fallbackGroup = groups[0] ?? {id: 'all', name: '所有', sessionIds: []}
      if (groups.length === 0) groups.push(fallbackGroup)
      session.groupId = fallbackGroup.id
      if (!fallbackGroup.sessionIds.includes(session.id)) fallbackGroup.sessionIds.push(session.id)
    }
  }

  return {
    ...state,
    version: currentVersion,
    substateVersions: normalizeSubstateVersions('substateVersions' in state ? state.substateVersions : undefined),
    sessions,
    groups,
    workspaceLayout: normalizeWorkspaceLayout(state.workspaceLayout),
    theme: isThemeName(state.theme) ? state.theme : 'dark',
  }
}

function normalizeSubstateVersions(value: unknown) {
  if (!value || typeof value !== 'object') return currentSubstateVersions
  const versions = value as Partial<typeof currentSubstateVersions>
  return {
    openPanes: versions.openPanes === currentSubstateVersions.openPanes ? versions.openPanes : currentSubstateVersions.openPanes,
    sessionTree: versions.sessionTree === currentSubstateVersions.sessionTree ? versions.sessionTree : currentSubstateVersions.sessionTree,
    sftp: versions.sftp === currentSubstateVersions.sftp ? versions.sftp : currentSubstateVersions.sftp,
    workspaceLayout: versions.workspaceLayout === currentSubstateVersions.workspaceLayout ? versions.workspaceLayout : currentSubstateVersions.workspaceLayout,
  }
}

function normalizeSession(session: SessionHost): SessionHost | null {
  if (!session.id || !session.name || !session.host || !session.username) return null
  const status = ['idle', 'failed'].includes(session.status) ? session.status : 'idle'
  return {
    ...session,
    backendSessionId: undefined,
    port: Number.isInteger(session.port) && session.port > 0 && session.port <= 65535 ? session.port : 22,
    protocol: session.protocol ?? 'ssh',
    status,
    tags: Array.isArray(session.tags) ? session.tags : [],
  }
}

function scrubSession(session: SessionHost): SessionHost {
  if (session.auth?.type === 'password') return {...session, auth: {...session.auth, password: null}}
  if (session.auth?.type === 'key') return {...session, auth: {...session.auth, passphrase: null}}
  return {...session}
}

function normalizeGroup(group: SessionGroup, sessionIds: Set<string>): SessionGroup | null {
  if (!group.id || !group.name) return null
  return {
    id: group.id,
    name: group.id === 'all' ? '所有' : group.name,
    sessionIds: Array.isArray(group.sessionIds) ? group.sessionIds.filter((id) => sessionIds.has(id)) : [],
    parentId: group.id === 'all' ? null : group.parentId ?? 'all',
  }
}

function ensureRootGroup(groups: SessionGroup[]) {
  const root = groups.find((group) => group.id === 'all')
  if (root) {
    root.name = '所有'
    root.parentId = null
  } else {
    groups.unshift({id: 'all', name: '所有', sessionIds: []})
  }
  const groupIds = new Set(groups.map((group) => group.id))
  for (const group of groups) {
    if (group.id !== 'all' && (!group.parentId || !groupIds.has(group.parentId))) group.parentId = 'all'
  }
  return groups
}

function snapshotWorkspaceLayout(): WorkspaceLayoutState {
  return normalizeWorkspaceLayout({
    activeBottomDockPanel: workspaceState.activeBottomDockPanel,
    activeMainView: workspaceState.activeMainView,
    activePanel: workspaceState.activePanel,
    activeRightPanel: workspaceState.activeRightPanel,
    bottomPanelHeight: workspaceState.bottomPanelHeight,
    bottomPanelVisible: workspaceState.bottomPanelVisible,
    compactMode: workspaceState.compactMode,
    density: workspaceState.density,
    dockOrder: workspaceState.dockOrder,
    layoutPreset: workspaceState.layoutPreset,
    mainAreaMode: workspaceState.mainAreaMode,
    mainSplitRatio: workspaceState.mainSplitRatio,
    panelPlacement: workspaceState.panelPlacement,
    recentBottomDockPanel: workspaceState.recentBottomDockPanel,
    recentRightPanel: workspaceState.recentRightPanel,
    rightPanelVisible: workspaceState.rightPanelVisible,
    rightPanelWidth: workspaceState.rightPanelWidth,
    sidebarVisible: workspaceState.sidebarVisible,
    sidebarWidth: workspaceState.sidebarWidth,
  })
}

function applyWorkspaceLayout(layout: WorkspaceLayoutState) {
  workspaceState.activeBottomDockPanel = layout.activeBottomDockPanel
  workspaceState.activeMainView = layout.activeMainView
  workspaceState.activePanel = layout.activePanel
  workspaceState.activeRightPanel = layout.activeRightPanel
  workspaceState.bottomPanelHeight = layout.bottomPanelHeight
  workspaceState.bottomPanelVisible = layout.bottomPanelVisible
  workspaceState.compactMode = layout.compactMode
  workspaceState.density = layout.density
  workspaceState.dockOrder = layout.dockOrder
  workspaceState.layoutPreset = layout.layoutPreset
  workspaceState.mainAreaMode = layout.mainAreaMode
  workspaceState.mainSplitRatio = layout.mainSplitRatio
  workspaceState.panelPlacement = layout.panelPlacement
  workspaceState.recentBottomDockPanel = layout.recentBottomDockPanel
  workspaceState.recentRightPanel = layout.recentRightPanel
  workspaceState.rightPanelVisible = layout.rightPanelVisible
  workspaceState.rightPanelWidth = layout.rightPanelWidth
  workspaceState.sidebarVisible = layout.sidebarVisible
  workspaceState.sidebarWidth = layout.sidebarWidth
}

function isPersistedEnvelope(input: unknown): input is PersistedEnvelope {
  if (!input || typeof input !== 'object') return false
  const envelope = input as {data?: unknown; savedAt?: unknown; schemaVersion?: number}
  return (envelope.schemaVersion === 5 || envelope.schemaVersion === currentVersion) && typeof envelope.savedAt === 'string' && isPersistedState(envelope.data)
}

function isPersistedState(input: unknown): input is PersistedState {
  if (!input || typeof input !== 'object') return false
  const state = input as Partial<PersistedState>
  return (state.version === 1 || state.version === 2 || state.version === 3 || state.version === 4 || state.version === 5 || state.version === currentVersion) && Array.isArray(state.sessions) && Array.isArray(state.groups)
}

function normalizeStartupWorkspaceLayout(layout: Partial<WorkspaceLayoutState>) {
  return normalizeWorkspaceLayout({
    ...layout,
    activeBottomDockPanel: 'none',
    activeMainView: 'terminal',
    bottomPanelVisible: false,
    mainAreaMode: 'single',
  })
}
