import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** Terminal session status */
export type TerminalStatus = 'connecting' | 'connected' | 'disconnected' | 'failed'

/** Terminal session metadata */
export interface TerminalSession {
  id: string
  host: string
  username: string
  status: TerminalStatus
}

export const useTerminalStore = defineStore('terminal', () => {
  /** All terminal sessions keyed by session id */
  const sessions = ref<Map<string, TerminalSession>>(new Map())

  /** Currently active (focused) terminal session id */
  const activeSessionId = ref<string | null>(null)

  /** List of all terminal sessions */
  const sessionList = computed(() => Array.from(sessions.value.values()))

  /** Connected sessions only */
  const connectedSessions = computed(() =>
    sessionList.value.filter((s) => s.status === 'connected')
  )

  /** Register a new terminal session */
  function addSession(session: TerminalSession) {
    sessions.value.set(session.id, session)
  }

  /** Update session status */
  function updateStatus(sessionId: string, status: TerminalStatus) {
    const session = sessions.value.get(sessionId)
    if (session) {
      sessions.value.set(sessionId, { ...session, status })
    }
  }

  /** Remove a terminal session */
  function removeSession(sessionId: string) {
    sessions.value.delete(sessionId)
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = null
    }
  }

  /** Set the active terminal session */
  function setActiveSession(sessionId: string | null) {
    activeSessionId.value = sessionId
  }

  /** Clear all sessions */
  function clearAll() {
    sessions.value.clear()
    activeSessionId.value = null
  }

  return {
    sessions,
    activeSessionId,
    sessionList,
    connectedSessions,
    addSession,
    updateStatus,
    removeSession,
    setActiveSession,
    clearAll,
  }
})
