<template>
  <footer class="status-bar" :title="connectionLabel">
    <span class="status-bar__connection">{{ connectionLabel }}</span>
  </footer>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {sessionState} from '../../entities/session'
import {terminalState} from '../../entities/terminal'

const activeSession = computed(() => {
  const activeTerminal = terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId)
  const sessionId = activeTerminal?.sessionId || sessionState.activeSessionId
  return sessionState.sessions.find((session) => session.id === sessionId) ?? null
})

const connectionLabel = computed(() => {
  const session = activeSession.value
  if (!session) return 'No active connection'
  return `${session.name}-${session.username}@${session.host}:${session.port}`
})
</script>
