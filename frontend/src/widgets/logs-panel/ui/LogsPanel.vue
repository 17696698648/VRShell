<template>
  <UiWorkbenchPanel compact class="logs-panel" title="Logs" :subtitle="`${logState.entries.length} entries`" aria-label="Application logs">
    <template #actions>
        <UiTooltip text="Clear log entries">
          <UiButton size="sm" variant="ghost" @click="clearLogs">Clear</UiButton>
        </UiTooltip>
        <UiTooltip text="Close Logs panel">
          <UiButton size="sm" variant="ghost" @click="closeLogsPanel">Close</UiButton>
        </UiTooltip>
    </template>
    <UiDataGrid v-if="logState.entries.length > 0" class="logs-panel__list" :columns="columns" :items="logState.entries" :item-height="58" :get-key="(entry) => entry.id" label="Application logs">
      <template #default="{item: entry, cellProps, gridStyle, rowProps}">
        <article v-bind="rowProps" :style="gridStyle" :class="['logs-panel__entry', `logs-panel__entry--${entry.level}`]">
          <time v-bind="cellProps(columns[0])" :datetime="new Date(entry.timestamp).toISOString()">{{ formatTime(entry.timestamp) }}</time>
          <span v-bind="cellProps(columns[1])"><UiStatusBadge :status="entry.level === 'fatal' || entry.level === 'error' ? 'danger' : entry.level" :label="entry.level" /></span>
          <span v-bind="cellProps(columns[2])">{{ entry.source }}</span>
          <strong v-bind="cellProps(columns[3])">{{ entry.message }}</strong>
        </article>
      </template>
    </UiDataGrid>
    <EmptyState v-else compact icon="☰" title="No logs yet" description="Warnings, errors, and user-facing feedback will appear here." />
  </UiWorkbenchPanel>
</template>

<script setup lang="ts">
import {closeLogsPanel} from '../../../features/workspace/open-logs-panel'
import {EmptyState, UiButton, UiDataGrid, UiStatusBadge, UiTooltip, UiWorkbenchPanel, type UiDataGridColumn} from '../../../shared/ui'
import {clearLogs, logState} from '../../../shared/lib/logger'

const columns: UiDataGridColumn[] = [
  {id: 'time', title: 'Time', width: '82px'},
  {id: 'level', title: 'Level', width: '98px'},
  {id: 'source', title: 'Source', width: '120px'},
  {id: 'message', title: 'Message', width: 'minmax(200px, 1fr)'},
]

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit'}).format(timestamp)
}
</script>
