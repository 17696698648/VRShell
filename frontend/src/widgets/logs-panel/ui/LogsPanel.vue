<template>
  <UiWorkbenchPanel compact class="logs-panel" title="Log Center" :subtitle="panelSubtitle" aria-label="Log Center">
    <template #actions>
      <div class="logs-panel__filters">
        <div class="logs-panel__view-switch" role="tablist" aria-label="Log view">
          <button
            v-for="view in views"
            :key="view.id"
            :class="['logs-panel__view-btn', {active: activeView === view.id}]"
            type="button"
            role="tab"
            :aria-selected="activeView === view.id"
            @click="activeView = view.id"
          >
            {{ view.label }}
            <span v-if="view.count?.()" class="logs-panel__count">{{ view.count() }}</span>
          </button>
        </div>
        <div v-if="activeView === 'logs'" class="logs-panel__level-filter" role="tablist" aria-label="Log level filter">
          <button
            v-for="level in logLevels"
            :key="level.id"
            :class="['logs-panel__level-btn', {active: activeLevel === level.id}]"
            type="button"
            @click="activeLevel = level.id"
          >
            {{ level.label }}
          </button>
        </div>
        <div v-else class="logs-panel__channel-filter" role="tablist" aria-label="Output channel filter">
          <button
            v-for="channel in outputChannels"
            :key="channel"
            :class="['logs-panel__channel-btn', {active: activeChannel === channel}]"
            type="button"
            @click="activeChannel = channel"
          >
            {{ channel }}
          </button>
        </div>
        <UiTooltip text="Clear entries">
          <UiButton size="sm" variant="ghost" @click="clearAll">Clear</UiButton>
        </UiTooltip>
      </div>
    </template>
    <UiDataGrid
      v-if="activeView === 'logs' && filteredLogEntries.length > 0"
      class="logs-panel__list"
      :columns="logColumns"
      :items="filteredLogEntries"
      :item-height="58"
      :get-key="(entry) => entry.id"
      label="Application logs"
    >
      <template #default="{item: entry, cellProps, gridStyle, rowProps}">
        <article v-bind="rowProps" :style="gridStyle" :class="['logs-panel__entry', `logs-panel__entry--${entry.level}`]">
          <time v-bind="cellProps(logColumns[0])" :datetime="new Date(entry.timestamp).toISOString()">{{ formatTime(entry.timestamp) }}</time>
          <span v-bind="cellProps(logColumns[1])"><UiStatusBadge :status="entry.level === 'fatal' || entry.level === 'error' ? 'danger' : entry.level" :label="entry.level" /></span>
          <span v-bind="cellProps(logColumns[2])">{{ entry.source }}</span>
          <strong v-bind="cellProps(logColumns[3])">{{ entry.message }}</strong>
        </article>
      </template>
    </UiDataGrid>
    <div
      v-else-if="activeView === 'output' && filteredOutputEntries.length > 0"
      class="logs-panel__output"
    >
      <pre><code><template v-for="entry in filteredOutputEntries" :key="entry.id">[{{ formatTime(entry.timestamp) }}] <span :class="`logs-panel__output--${entry.channel.toLowerCase()}`">{{ entry.channel }}</span> {{ entry.message }}
</template></code></pre>
    </div>
    <EmptyState
      v-else
      compact
      :icon="activeView === 'logs' ? '☰' : '▣'"
      :title="activeView === 'logs' ? 'No logs yet' : 'No output yet'"
      :description="activeView === 'logs' ? 'Warnings, errors, and user-facing feedback will appear here.' : 'Channel output from SSH, SFTP, Terminal, and Task will appear here.'"
    />
  </UiWorkbenchPanel>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {closeLogsPanel} from '../../../features/workspace/open-logs-panel'
import {EmptyState, UiButton, UiDataGrid, UiStatusBadge, UiTooltip, UiWorkbenchPanel, type UiDataGridColumn} from '../../../shared/ui'
import {clearLogs, logState, type LogEntry} from '../../../shared/lib/logger'
import {clearOutput, outputState, type OutputChannel, type OutputEntry} from '../../../shared/lib/outputChannels'

type LogView = 'logs' | 'output'
type LogLevelFilter = 'all' | 'warning' | 'error'

const views = [
  {id: 'logs' as const, label: 'Logs', count: () => logState.entries.length},
  {id: 'output' as const, label: 'Output', count: () => outputState.entries.length},
]
const logLevels = [
  {id: 'all' as const, label: 'All'},
  {id: 'warning' as const, label: 'Warning'},
  {id: 'error' as const, label: 'Error'},
]
const outputChannels: OutputChannel[] = ['Terminal', 'SSH', 'SFTP', 'Task']

const activeView = ref<LogView>('logs')
const activeLevel = ref<LogLevelFilter>('all')
const activeChannel = ref<OutputChannel>('Terminal')

const logColumns: UiDataGridColumn[] = [
  {id: 'time', title: 'Time', width: '82px'},
  {id: 'level', title: 'Level', width: '98px'},
  {id: 'source', title: 'Source', width: '120px'},
  {id: 'message', title: 'Message', width: 'minmax(200px, 1fr)'},
]

const filteredLogEntries = computed(() => {
  if (activeLevel.value === 'all') return logState.entries
  if (activeLevel.value === 'warning') return logState.entries.filter((e) => e.level === 'warning')
  return logState.entries.filter((e) => e.level === 'error' || e.level === 'fatal')
})

const filteredOutputEntries = computed(() =>
  outputState.entries.filter((e) => e.channel === activeChannel.value),
)

const panelSubtitle = computed(() => {
  if (activeView.value === 'logs') return `${filteredLogEntries.value.length} entries`
  return `${filteredOutputEntries.value.length} entries`
})

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit'}).format(timestamp)
}

function clearAll() {
  clearLogs()
  clearOutput()
}
</script>

<style scoped>
.logs-panel__filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.logs-panel__view-switch {
  display: flex;
  gap: 2px;
  background: var(--color-bg-inset, rgba(128, 128, 128, 0.1));
  border-radius: 6px;
  padding: 2px;
}

.logs-panel__view-btn {
  padding: 4px 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-secondary, #888);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.logs-panel__view-btn.active {
  background: var(--color-bg-card, #222);
  color: var(--color-text-primary, #eee);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.logs-panel__count {
  font-size: 10px;
  opacity: 0.7;
}

.logs-panel__level-filter,
.logs-panel__channel-filter {
  display: flex;
  gap: 2px;
  background: var(--color-bg-inset, rgba(128, 128, 128, 0.1));
  border-radius: 6px;
  padding: 2px;
}

.logs-panel__level-btn,
.logs-panel__channel-btn {
  padding: 3px 8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-secondary, #888);
  font-size: 11px;
  cursor: pointer;
}

.logs-panel__level-btn.active,
.logs-panel__channel-btn.active {
  background: var(--color-bg-card, #222);
  color: var(--color-text-primary, #eee);
}

.logs-panel__output {
  overflow: auto;
  height: 100%;
  padding: 8px 12px;
}

.logs-panel__output pre {
  margin: 0;
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.logs-panel__output--terminal { color: var(--color-info, #4fc3f7); }
.logs-panel__output--ssh { color: var(--color-success, #81c784); }
.logs-panel__output--sftp { color: var(--color-warning, #ffb74d); }
.logs-panel__output--task { color: var(--color-accent, #ce93d8); }
</style>
