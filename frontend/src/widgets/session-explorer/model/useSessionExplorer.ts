import {computed, ref} from 'vue'
import {sessionState} from '../../../entities/session'

export function useSessionExplorer() {
  const query = ref('')
  const filteredSessions = computed(() => {
    const keyword = query.value.trim().toLowerCase()
    if (!keyword) return sessionState.sessions
    return sessionState.sessions.filter((session) => [session.name, session.host, session.username, ...session.tags].join(' ').toLowerCase().includes(keyword))
  })

  return {query, filteredSessions, groups: sessionState.groups}
}
