import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { SessionGroup, SessionHost } from '../../../components/SessionTreeGroup.vue'
import { useAppCommandActions } from '../useAppCommandActions'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
}))

function createHost(overrides: Partial<SessionHost> = {}): SessionHost {
  return {
    name: 'prod',
    address: 'example.com',
    port: 22,
    user: 'root',
    authMethod: 'password',
    password: '',
    privateKeyPath: '',
    passphrase: '',
    remark: '',
    status: 'idle',
    latency: '-',
    active: false,
    autoReconnect: false,
    idleTimeoutSecs: 0,
    ...overrides,
  }
}

function createGroup(overrides: Partial<SessionGroup> = {}): SessionGroup {
  return {
    id: 'root',
    name: 'Root',
    icon: 'folder',
    children: [],
    hosts: [],
    ...overrides,
  }
}

function createActions() {
  const host = createHost()
  const activeDrawer = ref(null)
  const activeSession = ref<SessionHost | undefined>(host)
  const activeTheme = ref('dark' as never)
  const autoReconnectEnabled = ref(false)
  const calls = {
    closeSessionTab: vi.fn(),
    closeWindowMenu: vi.fn(),
    collapseAllGroups: vi.fn(),
    connectSession: vi.fn(),
    ensureActiveSftpLoaded: vi.fn().mockResolvedValue(undefined),
    loadSftpTreeRoot: vi.fn().mockResolvedValue(undefined),
    openCreateSessionDialog: vi.fn(),
    refreshSftpTreePath: vi.fn(),
    showToast: vi.fn(),
    testSessionConnection: vi.fn(),
    toggleDrawer: vi.fn(),
  }

  const actions = useAppCommandActions({
    activeDrawer,
    activeSession,
    activeTheme,
    autoReconnectEnabled,
    closeSessionTab: calls.closeSessionTab,
    closeWindowMenu: calls.closeWindowMenu,
    collapseAllGroups: calls.collapseAllGroups,
    connectSession: calls.connectSession,
    ensureActiveSftpLoaded: calls.ensureActiveSftpLoaded,
    loadSftpTreeRoot: calls.loadSftpTreeRoot,
    openCreateSessionDialog: calls.openCreateSessionDialog,
    refreshSftpTreePath: calls.refreshSftpTreePath,
    sessionGroups: [createGroup()],
    showToast: calls.showToast,
    testSessionConnection: calls.testSessionConnection,
    toggleDrawer: calls.toggleDrawer,
  })

  return {
    actions,
    activeDrawer,
    activeTheme,
    autoReconnectEnabled,
    calls,
  }
}

describe('useAppCommandActions', () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
  })

  it('dispatches window menu actions through handlers', () => {
    const { actions, calls } = createActions()

    actions.runWindowMenuAction('new_connection')
    actions.runWindowMenuAction('toggle_sessions')

    expect(calls.closeWindowMenu).toHaveBeenCalledTimes(2)
    expect(calls.openCreateSessionDialog).toHaveBeenCalledWith('root')
    expect(calls.toggleDrawer).toHaveBeenCalledWith('sessions')
  })

  it('opens sftp drawer from palette refresh command', () => {
    const { actions, activeDrawer, calls } = createActions()

    actions.handlePaletteAction('refresh_sftp')

    expect(activeDrawer.value).toBe('sftp')
    expect(calls.refreshSftpTreePath).toHaveBeenCalledTimes(1)
  })

  it('toggles auto reconnect from palette command', () => {
    const { actions, autoReconnectEnabled, calls } = createActions()

    actions.handlePaletteAction('ssh_auto_reconnect')

    expect(autoReconnectEnabled.value).toBe(true)
    expect(calls.showToast).toHaveBeenCalledWith('Auto reconnect enabled', 'success')
  })

  it('shows an error when HashKnownHosts update fails', async () => {
    const { actions, calls } = createActions()
    mocks.invoke.mockRejectedValueOnce(new Error('boom'))

    actions.handlePaletteAction('ssh_hash_known_hosts')
    await vi.waitFor(() => {
      expect(calls.showToast).toHaveBeenCalledWith('Failed to update HashKnownHosts', 'error')
    })
  })
})
