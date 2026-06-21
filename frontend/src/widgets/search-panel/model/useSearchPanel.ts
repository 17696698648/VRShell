import {computed, ref} from 'vue'

export const searchScopes = ['All', 'Sessions', 'Terminal', 'SFTP', 'Commands'] as const

export type SearchScope = (typeof searchScopes)[number]

export function useSearchPanel() {
  const activeScope = ref<SearchScope>('All')
  const query = ref('')

  const emptyTitle = computed(() => (query.value ? `No results for ${query.value}` : 'Start with a workspace search'))

  return {
    activeScope,
    emptyTitle,
    query,
    scopes: searchScopes,
  }
}
