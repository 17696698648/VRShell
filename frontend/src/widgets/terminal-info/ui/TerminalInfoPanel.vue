<template>
  <section class="terminal-info-panel" aria-label="Terminal info">
    <header><div><strong>Terminal Info</strong><small>{{ terminal?.title ?? 'No active terminal' }}</small></div></header>
    <div v-if="terminal" class="terminal-info-panel__content"><dl><div><dt>Status</dt><dd>{{ terminal.status }}</dd></div><div><dt>CWD</dt><dd>{{ terminal.cwd }}</dd></div><div><dt>Session</dt><dd>{{ terminal.sessionId }}</dd></div><div><dt>Backend</dt><dd>{{ terminal.backendSessionId }}</dd></div></dl></div>
    <EmptyState v-else compact icon="TERM" title="No active terminal" description="Open or select a terminal to inspect runtime details." />
  </section>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {terminalState} from '../../../entities/terminal'
import {EmptyState} from '../../../shared/ui'
const terminal = computed(() => terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId) ?? null)
</script>
