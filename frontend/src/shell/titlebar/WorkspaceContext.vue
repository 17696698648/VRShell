<template>
  <button class="workspace-context" type="button" title="Quick switch sessions and terminals (Ctrl+O)" @click="openQuickOpen">
    <span class="workspace-context__status" :class="activeTerminal?.status ?? activeSession?.status" />
    <span class="workspace-context__main">
      <strong>{{ title }}</strong>
      <small>{{ subtitle }}</small>
    </span>
    <kbd>Ctrl+O</kbd>
  </button>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {getActiveSession} from '../../entities/session'
import {terminalState} from '../../entities/terminal'
import {openQuickOpen} from '../../features/workspace/quick-open/quickOpen'

const activeTerminal = computed(() => terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId) ?? null)
const activeSession = computed(() => getActiveSession())
const title = computed(() => activeTerminal.value?.title ?? activeSession.value?.name ?? 'No active session')
const subtitle = computed(() => {
  if (activeTerminal.value) return `${activeTerminal.value.cwd} · ${activeTerminal.value.status}`
  if (activeSession.value) return `${activeSession.value.username}@${activeSession.value.host}:${activeSession.value.port}`
  return 'Use Quick Switcher to open a session'
})
</script>
