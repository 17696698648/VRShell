<template>
  <section class="terminal-workbench">
    <TerminalTabs />
    <TerminalToolbar />
    <TerminalSearchBar v-if="terminalSearchState.open && activeTerminal" :tab-id="activeTerminal.id" />
    <TerminalPane v-if="activeTerminal" :terminal="activeTerminal" />
    <TerminalEmptyState v-else />
  </section>
</template>

<script setup lang="ts">
import {terminalSearchState} from '../../../features/terminal/search-terminal/searchTerminal'
import {useTerminalWorkbench} from '../model/useTerminalWorkbench'
import TerminalEmptyState from './TerminalEmptyState.vue'
import TerminalPane from './TerminalPane.vue'
import TerminalSearchBar from './TerminalSearchBar.vue'
import TerminalTabs from './TerminalTabs.vue'
import TerminalToolbar from './TerminalToolbar.vue'

const {activeTerminal} = useTerminalWorkbench()
</script>
