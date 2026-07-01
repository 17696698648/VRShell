import {computed, ref} from 'vue'
import {sessionState, type SessionHost} from '../../../entities/session'
import {favoriteSessionTag} from '../../../features/session/edit-session/sessionActions'

interface SearchableSession {
  session: SessionHost
  searchText: string
}

export function useSessionExplorer() {
  const query = ref('')
  const favoriteOnly = ref(false)
  const searchableSessions = computed<SearchableSession[]>(() => sessionState.sessions.map((session) => ({session, searchText: createSessionSearchText(session)})))
  const filteredSessions = computed(() => {
    const keyword = query.value.trim().toLowerCase()
    return searchableSessions.value.filter(({session, searchText}) => {
      if (favoriteOnly.value && !session.tags.includes(favoriteSessionTag)) return false
      if (!keyword) return true
      return searchText.includes(keyword)
    }).map(({session}) => session)
  })

  return {query, favoriteOnly, filteredSessions, groups: sessionState.groups}
}

function createSessionSearchText(session: SessionHost) {
  return [session.name, session.host, session.username, ...session.tags.map((tag) => `#${tag}`), ...session.tags].join(' ').toLowerCase()
}
