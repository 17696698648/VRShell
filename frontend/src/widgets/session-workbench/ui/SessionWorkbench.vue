<template>
  <section class="session-workbench" :class="{'session-workbench--search-open': terminalSearchState.open && activeTerminal}">
    <SessionTabs />
    <SessionPane :editor-open="editorOpen" :session-id="activeSession?.id ?? ''">
      <template #editor>
        <SessionEditorArea v-if="editorOpen && activeSession" :session-id="activeSession.id" />
      </template>
      <template #terminal>
        <SessionTerminalArea>
          <SessionTerminalTabs />
          <SessionTerminalSearchBar v-if="terminalSearchState.open && activeTerminal" :tab-id="activeTerminal.id" />
          <SessionTerminalPane v-if="activeTerminal" :terminal="activeTerminal" />
          <SessionEmptyState v-else />
        </SessionTerminalArea>
      </template>
    </SessionPane>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {getSessionEditorFile} from '../../../entities/editor'
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

const {activeTerminal, activeSession} = useSessionWorkbench()
const editorOpen = computed(() => Boolean(activeSession.value && getSessionEditorFile(activeSession.value.id)))
</script>
