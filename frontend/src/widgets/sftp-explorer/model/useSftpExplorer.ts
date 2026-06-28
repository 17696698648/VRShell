import {computed, watch} from 'vue'
import {sessionState, setActiveSession} from '../../../entities/session'
import {activateSftpSessionState, clearSftpState, getSftpSessionState, persistActiveSftpState, sftpState, type SftpItem} from '../../../entities/sftp'
import {listRemoteDirectory} from '../../../entities/sftp/api/sftpRepository'
import {terminalState} from '../../../entities/terminal'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'

const refreshVersions = new Map<string, number>()

export function useSftpExplorer() {
  const activeSession = computed(() => sessionState.sessions.find((session) => session.id === sessionState.activeSessionId) ?? null)
  const hasConnectedTerminal = computed(() => {
    const session = activeSession.value
    if (!session) return false
    return terminalState.tabs.some((tab) => tab.sessionId === session.id && tab.status === 'connected')
  })

  watch(
    () => terminalState.activeTerminalId,
    (terminalId) => {
      const tab = terminalState.tabs.find((item) => item.id === terminalId)
      if (tab && tab.sessionId !== sessionState.activeSessionId) setActiveSession(tab.sessionId)
    },
    {immediate: true},
  )

  watch([activeSession, hasConnectedTerminal], ([session, connected]) => {
    if (!session || !connected) {
      persistActiveSftpState()
      clearSftpState()
      return
    }
    if (sftpState.connectedSessionId !== session.id) {
      persistActiveSftpState()
      activateSftpSessionState(session.id)
    }
    if (!sftpState.initialized) void refresh(sftpState.path, {automatic: true})
  }, {immediate: true})

  async function refresh(path = sftpState.path, options: {automatic?: boolean} = {}) {
    const session = activeSession.value
    if (!session) return
    const sessionState = getSftpSessionState(session.id)
    if (options.automatic && sessionState.loading) return
    const version = (refreshVersions.get(session.id) ?? 0) + 1
    refreshVersions.set(session.id, version)
    if (sftpState.connectedSessionId !== session.id) activateSftpSessionState(session.id)
    sessionState.loading = true
    sftpState.loading = true
    sftpState.error = ''
    persistActiveSftpState()
    try {
      const items = await listRemoteDirectory(session, path)
      if (refreshVersions.get(session.id) !== version) return
      applyDirectoryState(session.id, path, items)
      if (activeSession.value?.id === session.id) syncActiveDirectoryState(session.id)
    } catch (error) {
      if (refreshVersions.get(session.id) !== version) return
      applyDirectoryError(session.id, getErrorMessage(error))
    } finally {
      if (refreshVersions.get(session.id) !== version) return
      sessionState.loading = false
      sftpState.loading = false
      persistActiveSftpState()
    }
  }

  function openParentDirectory() {
    if (sftpState.path === '/') return refresh('/')
    const parentPath = sftpState.path.split('/').filter(Boolean).slice(0, -1).join('/')
    return refresh(parentPath ? `/${parentPath}` : '/')
  }

  return {sftpState, activeSession, hasConnectedTerminal, refresh, openParentDirectory}
}

function applyDirectoryState(sessionId: string, path: string, items: SftpItem[]) {
  Object.assign(getSftpSessionState(sessionId), {
    connectedSessionId: sessionId,
    error: '',
    initialized: true,
    items,
    loading: false,
    path,
  })
}

function applyDirectoryError(sessionId: string, error: string) {
  Object.assign(getSftpSessionState(sessionId), {error, initialized: true, loading: false})
  if (sftpState.connectedSessionId === sessionId) Object.assign(sftpState, {error, initialized: true})
}

function syncActiveDirectoryState(sessionId: string) {
  const sessionState = getSftpSessionState(sessionId)
  Object.assign(sftpState, {
    connectedSessionId: sessionState.connectedSessionId,
    error: sessionState.error,
    initialized: sessionState.initialized,
    items: sessionState.items,
    path: sessionState.path,
  })
}
