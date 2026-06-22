<template>
  <UiPanel compact class="problems-panel" aria-label="Problems">
    <UiToolbar label="Problems actions">
      <template #leading>
        <div class="ui-toolbar__title"><strong>Problems</strong><small>{{ problemEntries.length }} warnings/errors</small></div>
      </template>
      <template #trailing>
        <UiActionButton command-id="workspace.openLogsPanel" label="Open Logs" tooltip="Open Logs panel" />
      </template>
    </UiToolbar>
    <UiDataGrid v-if="problemEntries.length > 0" class="problems-panel__list" :columns="columns" :items="problemEntries" :item-height="54" :get-key="(entry) => entry.id" label="Problems" @activate="openLogs">
      <template #default="{item: entry, gridStyle, rowProps}">
        <article v-bind="rowProps" :style="gridStyle" :class="['problems-panel__entry', `problems-panel__entry--${entry.level}`]" title="Open Logs" @click="openLogs">
          <UiStatusBadge :status="entry.level === 'warning' ? 'warning' : 'danger'" :label="entry.level" />
          <strong>{{ entry.message }}</strong>
          <span>{{ entry.source }}</span>
          <small v-if="entry.detail">{{ entry.detail }}</small>
        </article>
      </template>
    </UiDataGrid>
    <EmptyState v-else compact icon="✓" title="No problems" description="Warnings and errors from logs are grouped here." />
  </UiPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {executeCommand} from '../../../features/workspace/command-registry'
import {logState} from '../../../shared/lib/logger'
import {EmptyState, UiActionButton, UiDataGrid, UiPanel, UiStatusBadge, UiToolbar, type UiDataGridColumn} from '../../../shared/ui'

const columns: UiDataGridColumn[] = [
  {id: 'level', title: 'Level', width: '100px'},
  {id: 'message', title: 'Message', width: 'minmax(220px, 1fr)'},
  {id: 'source', title: 'Source', width: '120px'},
  {id: 'detail', title: 'Detail', width: 'minmax(140px, 0.8fr)'},
]

const problemEntries = computed(() => logState.entries.filter((entry) => entry.level === 'warning' || entry.level === 'error' || entry.level === 'fatal'))
function openLogs() {
  void executeCommand('workspace.openLogsPanel')
}
</script>
