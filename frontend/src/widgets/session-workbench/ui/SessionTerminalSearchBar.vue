<template>
  <form class="session-terminal-search" @submit.prevent="selectNextTerminalSearchMatch(tabId)">
    <input
      :value="terminalSearchState.query"
      autofocus
      placeholder="Search terminal output"
      @input="setTerminalSearchQuery(($event.target as HTMLInputElement).value)"
      @keydown.escape="closeTerminalSearch"
      @keydown.shift.enter.prevent="selectPreviousTerminalSearchMatch(tabId)"
    />
    <span>{{ summaryLabel }}</span>
    <button type="button" :disabled="summary.total === 0" @click="selectPreviousTerminalSearchMatch(tabId)">Prev</button>
    <button type="submit" :disabled="summary.total === 0">Next</button>
    <button type="button" :disabled="terminalSearchState.query.length === 0" @click="setTerminalSearchQuery('')">Clear</button>
    <button type="button" @click="closeTerminalSearch">Close</button>
  </form>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {
  closeTerminalSearch,
  getTerminalSearchSummary,
  selectNextTerminalSearchMatch,
  selectPreviousTerminalSearchMatch,
  setTerminalSearchQuery,
  terminalSearchState,
} from '../../../features/terminal/search-terminal/searchTerminal'

const props = defineProps<{tabId: string}>()
const summary = computed(() => getTerminalSearchSummary(props.tabId))
const summaryLabel = computed(() => terminalSearchState.query.trim() ? `${summary.value.current}/${summary.value.total} matches` : 'Enter query')
</script>
