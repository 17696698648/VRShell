import { ref } from 'vue'
import type { Terminal } from '@xterm/xterm'
import type { SearchAddon } from '@xterm/addon-search'

export function useTerminalSearch({
  getSearchAddon,
  getTerminal,
}: {
  getSearchAddon: () => SearchAddon | null
  getTerminal: () => Terminal | null
}) {
  const searchVisible = ref(false)
  const searchQuery = ref('')
  const searchInputRef = ref<HTMLInputElement | null>(null)

  function openSearch() {
    searchVisible.value = true
    setTimeout(() => {
      searchInputRef.value?.focus()
      searchInputRef.value?.select()
    }, 50)
  }

  function closeSearch() {
    searchVisible.value = false
    searchQuery.value = ''
    getTerminal()?.focus()
  }

  function doSearch() {
    const searchAddon = getSearchAddon()
    if (!searchAddon || !searchQuery.value) return
    searchAddon.findNext(searchQuery.value, { incremental: true })
  }

  function findNext() {
    const searchAddon = getSearchAddon()
    if (!searchAddon || !searchQuery.value) return
    searchAddon.findNext(searchQuery.value)
  }

  function findPrev() {
    const searchAddon = getSearchAddon()
    if (!searchAddon || !searchQuery.value) return
    searchAddon.findPrevious(searchQuery.value)
  }

  return {
    closeSearch,
    doSearch,
    findNext,
    findPrev,
    openSearch,
    searchInputRef,
    searchQuery,
    searchVisible,
  }
}
