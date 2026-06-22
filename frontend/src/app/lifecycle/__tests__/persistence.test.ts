import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {sessionState, type SessionGroup, type SessionHost} from '../../../entities/session'
import {workspaceState} from '../../../entities/workspace'
import {migratePersistedState, persistState, restorePersistedState} from '../persistence'

const storageKey = 'vrshell-ui-state-v1'
const cloneState = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const defaultGroups = cloneState(sessionState.groups)
const defaultSessions = cloneState(sessionState.sessions)
const defaultActiveSessionId = sessionState.activeSessionId
const defaultActivePanel = workspaceState.activePanel
const defaultSidebarVisible = workspaceState.sidebarVisible
const defaultSidebarWidth = workspaceState.sidebarWidth
const defaultBottomPanelVisible = workspaceState.bottomPanelVisible
const defaultBottomPanelHeight = workspaceState.bottomPanelHeight
const defaultMainAreaMode = workspaceState.mainAreaMode
const defaultDensity = workspaceState.density
const defaultTheme = workspaceState.theme

describe('persistence', () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    })
  })

  afterEach(() => {
    localStorage.clear()
    sessionState.groups.splice(0, sessionState.groups.length, ...cloneState(defaultGroups))
    sessionState.sessions.splice(0, sessionState.sessions.length, ...cloneState(defaultSessions))
    sessionState.activeSessionId = defaultActiveSessionId
    workspaceState.activePanel = defaultActivePanel
    workspaceState.sidebarVisible = defaultSidebarVisible
    workspaceState.sidebarWidth = defaultSidebarWidth
    workspaceState.bottomPanelVisible = defaultBottomPanelVisible
    workspaceState.bottomPanelHeight = defaultBottomPanelHeight
    workspaceState.mainAreaMode = defaultMainAreaMode
    workspaceState.density = defaultDensity
    workspaceState.theme = defaultTheme
    vi.unstubAllGlobals()
  })

  it('persists session and workspace state', () => {
    sessionState.activeSessionId = 'staging-web'
    workspaceState.activePanel = 'search'
    workspaceState.sidebarWidth = 360
    workspaceState.bottomPanelVisible = true
    workspaceState.mainAreaMode = 'vertical-split'
    workspaceState.density = 'comfortable'
    workspaceState.theme = 'light'

    persistState()

    const persisted = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    expect(persisted).toMatchObject({
      version: 3,
      activeSessionId: 'staging-web',
      workspaceLayout: {
        activePanel: 'search',
        sidebarWidth: 360,
        bottomPanelVisible: true,
        mainAreaMode: 'vertical-split',
        density: 'comfortable',
      },
      theme: 'light',
    })
    expect(persisted.sessions).toHaveLength(sessionState.sessions.length)
    expect(persisted.groups).toHaveLength(sessionState.groups.length)
  })

  it('restores persisted compatible state', () => {
    const groups: SessionGroup[] = [{id: 'custom', name: 'Custom', sessionIds: ['custom-host']}]
    const sessions: SessionHost[] = [
      {
        id: 'custom-host',
        name: 'custom-host',
        host: 'example.com',
        port: 22,
        username: 'deploy',
        protocol: 'ssh',
        groupId: 'custom',
        tags: ['test'],
        status: 'idle',
        auth: {type: 'agent'},
      },
    ]

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 3,
        groups,
        sessions,
        activeSessionId: 'custom-host',
        workspaceLayout: {
          activePanel: 'sftp',
          sidebarVisible: true,
          sidebarWidth: 320,
          bottomPanelVisible: true,
          bottomPanelHeight: 260,
          mainAreaMode: 'horizontal-split',
          density: 'comfortable',
        },
        theme: 'light',
      }),
    )

    restorePersistedState()

    expect(sessionState.groups).toEqual(groups)
    expect(sessionState.sessions).toEqual(sessions)
    expect(sessionState.activeSessionId).toBe('custom-host')
    expect(workspaceState.activePanel).toBe('sftp')
    expect(workspaceState.sidebarWidth).toBe(320)
    expect(workspaceState.bottomPanelVisible).toBe(true)
    expect(workspaceState.mainAreaMode).toBe('horizontal-split')
    expect(workspaceState.density).toBe('comfortable')
    expect(workspaceState.theme).toBe('light')
  })

  it('keeps high contrast theme during migration', () => {
    const migrated = migratePersistedState({
      version: 3,
      groups: [],
      sessions: [],
      activeSessionId: '',
      workspaceLayout: {
        activePanel: 'sessions',
        sidebarVisible: true,
        sidebarWidth: 280,
        bottomPanelVisible: false,
        bottomPanelHeight: 220,
        mainAreaMode: 'single',
        density: 'compact',
      },
      theme: 'high-contrast',
    })

    expect(migrated?.theme).toBe('high-contrast')
  })

  it('normalizes v3 workspace layout', () => {
    const migrated = migratePersistedState({
      version: 3,
      groups: [],
      sessions: [],
      activeSessionId: '',
      workspaceLayout: {
        activePanel: 'search',
        sidebarVisible: false,
        sidebarWidth: 999,
        bottomPanelVisible: true,
        bottomPanelHeight: 1,
        mainAreaMode: 'bad-mode',
        density: 'comfortable',
      },
      theme: 'dark',
    })

    expect(migrated?.workspaceLayout).toMatchObject({
      activePanel: 'search',
      bottomPanelHeight: 160,
      density: 'comfortable',
      mainAreaMode: 'horizontal-split',
      sidebarVisible: false,
      sidebarWidth: 420,
    })
  })

  it('migrates v1 state to current schema', () => {
    const migrated = migratePersistedState({
      version: 1,
      groups: [{id: 'custom', name: 'Custom', sessionIds: ['custom-host', 'missing']}],
      sessions: [{id: 'custom-host', name: 'custom-host', host: 'example.com', port: 0, username: 'deploy', protocol: 'ssh', groupId: 'custom', tags: null, status: 'unknown'}],
      activeSessionId: 'missing',
      activePanel: 'bad-panel',
      theme: 'bad-theme',
    })

    expect(migrated).toMatchObject({version: 3, workspaceLayout: {activePanel: 'sessions'}, theme: 'dark'})
    expect(migrated?.sessions[0]).toMatchObject({port: 22, tags: [], status: 'idle'})
    expect(migrated?.groups[0].sessionIds).toEqual(['custom-host'])
  })

  it('removes corrupted persisted state', () => {
    localStorage.setItem(storageKey, '{broken')

    restorePersistedState()

    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('removes unsupported persisted versions', () => {
    localStorage.setItem(storageKey, JSON.stringify({version: 99, groups: [], sessions: []}))

    restorePersistedState()

    expect(localStorage.getItem(storageKey)).toBeNull()
  })
})
