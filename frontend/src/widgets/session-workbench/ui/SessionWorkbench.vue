<template>
  <section class="session-workbench" :class="{'session-workbench--search-open': terminalSearchState.open && activeTerminal}">
    <SessionTabs />
    <SessionPane :editor-open="editorOpen">
      <template #terminal>
        <SessionTerminalArea>
          <SessionTerminalTabs />
          <SessionTerminalSearchBar v-if="terminalSearchState.open && activeTerminal" :tab-id="activeTerminal.id" />
          <SessionTerminalPane v-if="activeTerminal" :terminal="activeTerminal" />
          <SessionEmptyState v-else />
        </SessionTerminalArea>
      </template>
      <template #editor>
        <SessionEditorArea v-if="editorOpen" />
      </template>
    </SessionPane>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {terminalSearchState} from '../../../features/terminal/search-terminal/searchTerminal'
import {useSessionWorkbench} from '../model/useSessionWorkbench'
import SessionEditorArea from './SessionEditorArea.vue'
import SessionEmptyState from './SessionEmptyState.vue'
import SessionPane from './SessionPane.vue'
import SessionTabs from './SessionTabs.vue'
import SessionTerminalArea from './SessionTerminalArea.vue'
import SessionTerminalPane from './SessionTerminalPane.vue'
import SessionTerminalSearchBar from './SessionTerminalSearchBar.vue'
import SessionTerminalTabs from './SessionTerminalTabs.vue'

const {activeTerminal} = useSessionWorkbench()
const editorOpen = computed(() => false)
</script>
