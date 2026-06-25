import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** Session group in the session tree */
export interface SessionGroup {
  id: string
  name: string
  sessions: SessionItem[]
}

/** Individual session entry */
export interface SessionItem {
  id: string
  name: string
  host: string
  port: number
  username: string
  authMethod?: string
  groupId: string
}

export const useSessionStore = defineStore('session', () => {
  /** All session groups */
  const groups = ref<SessionGroup[]>([])

  /** Currently selected session id */
  const selectedSessionId = ref<string | null>(null)

  /** Flat list of all sessions across all groups */
  const allSessions = computed(() =>
    groups.value.flatMap((group) =>
      group.sessions.map((session) => ({ ...session, groupId: group.id }))
    )
  )

  /** Find a session by id */
  function findSession(sessionId: string): SessionItem | undefined {
    return allSessions.value.find((s) => s.id === sessionId)
  }

  /** Replace the entire session tree */
  function setGroups(newGroups: SessionGroup[]) {
    groups.value = newGroups
  }

  /** Set the selected session */
  function selectSession(sessionId: string | null) {
    selectedSessionId.value = sessionId
  }

  return {
    groups,
    selectedSessionId,
    allSessions,
    findSession,
    setGroups,
    selectSession,
  }
})
