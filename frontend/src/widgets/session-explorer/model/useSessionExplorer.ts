import {computed, ref} from 'vue'
import {sessionState} from '../../../entities/session'
import {favoriteSessionTag} from '../../../features/session/edit-session/sessionActions'

export function useSessionExplorer() {
  const query = ref('')
  const favoriteOnly = ref(false)
  const filteredSessions = computed(() => {
    const keyword = query.value.trim().toLowerCase()
    return sessionState.sessions.filter((session) => {
      if (favoriteOnly.value && !session.tags.includes(favoriteSessionTag)) return false
      if (!keyword) return true
      return [session.name, session.host, session.username, ...session.tags.map((tag) => `#${tag}`), ...session.tags].join(' ').toLowerCase().includes(keyword)
    })
  })

  return {query, favoriteOnly, filteredSessions, groups: sessionState.groups}
}
