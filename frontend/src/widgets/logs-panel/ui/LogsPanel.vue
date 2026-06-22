<template>
  <UiPanel compact class="logs-panel" aria-label="Application logs">
    <UiToolbar label="Log actions">
      <template #leading>
        <div class="ui-toolbar__title">
          <strong>Logs</strong>
          <small>{{ logState.entries.length }} entries</small>
        </div>
      </template>
      <template #trailing>
        <UiTooltip text="Clear log entries">
          <UiButton size="sm" variant="ghost" @click="clearLogs">Clear</UiButton>
        </UiTooltip>
        <UiTooltip text="Close Logs panel">
          <UiButton size="sm" variant="ghost" @click="closeLogsPanel">Close</UiButton>
        </UiTooltip>
      </template>
    </UiToolbar>
    <UiVirtualList v-if="logState.entries.length > 0" class="logs-panel__list" :items="logState.entries" :item-height="58" :get-key="(entry) => entry.id">
      <template #default="{item: entry}">
        <article :class="['logs-panel__entry', `logs-panel__entry--${entry.level}`]">
          <time :datetime="new Date(entry.timestamp).toISOString()">{{ formatTime(entry.timestamp) }}</time>
          <UiStatusBadge :status="entry.level === 'fatal' || entry.level === 'error' ? 'danger' : entry.level" :label="entry.level" />
          <span>{{ entry.source }}</span>
          <strong>{{ entry.message }}</strong>
          <small v-if="entry.detail">{{ entry.detail }}</small>
        </article>
      </template>
    </UiVirtualList>
    <EmptyState v-else compact icon="☰" title="No logs yet" description="Warnings, errors, and user-facing feedback will appear here." />
  </UiPanel>
</template>

<script setup lang="ts">
import {closeLogsPanel} from '../../../features/workspace/open-logs-panel'
import {EmptyState, UiButton, UiPanel, UiStatusBadge, UiToolbar, UiTooltip, UiVirtualList} from '../../../shared/ui'
import {clearLogs, logState} from '../../../shared/lib/logger'

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit'}).format(timestamp)
}
</script>
