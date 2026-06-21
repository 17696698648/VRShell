<template>
  <section class="logs-panel" aria-label="Application logs">
    <header class="logs-panel__header">
      <div>
        <strong>Logs</strong>
        <small>{{ logState.entries.length }} entries</small>
      </div>
      <div class="panel__actions">
        <button type="button" @click="clearLogs">Clear</button>
        <button type="button" @click="closeLogsPanel">Close</button>
      </div>
    </header>
    <div v-if="logState.entries.length > 0" class="logs-panel__list">
      <article v-for="entry in logState.entries" :key="entry.id" :class="['logs-panel__entry', `logs-panel__entry--${entry.level}`]">
        <time :datetime="new Date(entry.timestamp).toISOString()">{{ formatTime(entry.timestamp) }}</time>
        <span>{{ entry.source }}</span>
        <strong>{{ entry.message }}</strong>
        <small v-if="entry.detail">{{ entry.detail }}</small>
      </article>
    </div>
    <EmptyState v-else compact icon="☰" title="No logs yet" description="Warnings, errors, and user-facing feedback will appear here." />
  </section>
</template>

<script setup lang="ts">
import {closeLogsPanel} from '../../../features/workspace/open-logs-panel'
import {EmptyState} from '../../../shared/ui'
import {clearLogs, logState} from '../../../shared/lib/logger'

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit'}).format(timestamp)
}
</script>
