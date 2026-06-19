import { invoke } from '@tauri-apps/api/core'
import type { Ref } from 'vue'
import type { SessionGroup, SessionHost } from '../../components/SessionTreeGroup.vue'
import { applyPaletteAction } from '../../utils/paletteActions'
import {
  runWindowMenuAction as dispatchWindowMenuAction,
  type WindowMenuActionHandlers,
} from '../../utils/windowMenuActions'
import type { ThemeName } from './useThemeState'
import type { AppDrawerName } from './useAppLayoutState'
import type { WindowMenuAction } from '../../windowMenus'

type SftpOpenMode = Parameters<WindowMenuActionHandlers['openSftpDrawer']>[0]

type ShowToast = (message: string, type?: 'success' | 'error' | 'info') => void

export function useAppCommandActions({
  activeDrawer,
  activeSession,
  activeTheme,
  autoReconnectEnabled,
  closeSessionTab,
  closeWindowMenu,
  collapseAllGroups,
  connectSession,
  ensureActiveSftpLoaded,
  loadSftpTreeRoot,
  openCreateSessionDialog,
  refreshSftpTreePath,
  sessionGroups,
  showShortcutHelp,
  showToast,
  testSessionConnection,
  toggleDrawer,
}: {
  activeDrawer: Ref<AppDrawerName | null>
  activeSession: Ref<SessionHost | undefined>
  activeTheme: Ref<ThemeName>
  autoReconnectEnabled: Ref<boolean>
  closeSessionTab: (sessionName: string) => void
  closeWindowMenu: () => void
  collapseAllGroups: () => void
  connectSession: (sessionName: string) => void
  ensureActiveSftpLoaded: () => Promise<void>
  loadSftpTreeRoot: () => Promise<void>
  openCreateSessionDialog: (groupId: string) => void
  refreshSftpTreePath: () => unknown
  sessionGroups: SessionGroup[]
  showShortcutHelp?: () => void
  showToast: ShowToast
  testSessionConnection: () => void
  toggleDrawer: (drawerName: AppDrawerName) => void
}) {
  function closeActiveSession() {
    if (activeSession.value) {
      closeSessionTab(activeSession.value.name)
    }
  }

  function openSftpDrawer(mode: SftpOpenMode) {
    activeDrawer.value = 'sftp'
    if (activeSession.value) {
      mode === 'refresh' ? refreshSftpTreePath() : loadSftpTreeRoot()
    }
  }

  function openSftpFromPalette(mode: SftpOpenMode) {
    activeDrawer.value = 'sftp'
    if (activeSession.value) {
      mode === 'refresh' ? refreshSftpTreePath() : ensureActiveSftpLoaded()
    }
  }

  function runWindowMenuAction(action: WindowMenuAction) {
    dispatchWindowMenuAction(action, {
      closeWindowMenu,
      openCreateSessionDialog: () => openCreateSessionDialog(sessionGroups[0]?.id ?? ''),
      closeActiveSession,
      toggleSessionsDrawer: () => toggleDrawer('sessions'),
      openSftpDrawer,
      collapseAllGroups,
      testSessionConnection,
      showAbout: () => showToast('VRShell'),
    })
  }

  async function toggleHashKnownHosts() {
    try {
      const enabled = await invoke<boolean>('get_hash_known_hosts')
      await invoke('set_hash_known_hosts', { enabled: !enabled })
      showToast(`HashKnownHosts ${!enabled ? 'enabled' : 'disabled'}`, 'success')
    } catch {
      showToast('Failed to update HashKnownHosts', 'error')
    }
  }

  function toggleAutoReconnect() {
    autoReconnectEnabled.value = !autoReconnectEnabled.value
    showToast(`Auto reconnect ${autoReconnectEnabled.value ? 'enabled' : 'disabled'}`, 'success')
  }

  function openShortcutHelp() {
    showShortcutHelp?.()
  }

  function handlePaletteAction(action: string, payload?: string) {
    if (action === 'ssh_hash_known_hosts') {
      void toggleHashKnownHosts()
      return
    }

    if (action === 'ssh_auto_reconnect') {
      toggleAutoReconnect()
      return
    }

    if (action === 'show_shortcuts') {
      openShortcutHelp()
      return
    }

    applyPaletteAction({
      action,
      payload,
      openCreateSessionDialog: () => openCreateSessionDialog(sessionGroups[0]?.id ?? ''),
      closeActiveSession,
      toggleSessions: () => toggleDrawer('sessions'),
      openSftp: openSftpFromPalette,
      collapseAllGroups,
      connectSession,
      switchTheme: (themeName) => (activeTheme.value = themeName as ThemeName),
    })
  }

  return {
    handlePaletteAction,
    runWindowMenuAction,
  }
}
