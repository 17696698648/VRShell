<template>
  <UiWorkbenchPanel compact class="problems-panel" title="Problems" :subtitle="`${problemEntries.length} warnings/errors`" aria-label="Problems">
    <template #actions>
        <UiActionButton command-id="workspace.openLogsPanel" label="Open Logs" tooltip="Open Logs panel" />
    </template>
    <UiDataGrid v-if="problemEntries.length > 0" class="problems-panel__list" :columns="columns" :items="problemEntries" :item-height="54" :get-key="(entry) => entry.id" label="Problems" @activate="openLogs">
      <template #default="{item: entry, cellProps, gridStyle, rowProps}">
        <article v-bind="rowProps" :style="gridStyle" :class="['problems-panel__entry', `problems-panel__entry--${entry.level}`]" title="Open Logs" @click="openLogs">
          <span v-bind="cellProps(columns[0])"><UiStatusBadge :status="entry.level === 'warning' ? 'warning' : 'danger'" :label="entry.level" /></span>
          <strong v-bind="cellProps(columns[1])">{{ entry.message }}</strong>
          <span v-bind="cellProps(columns[2])">{{ entry.source }}</span>
          <small v-bind="cellProps(columns[3])">{{ entry.detail }}</small>
        </article>
      </template>
    </UiDataGrid>
    <EmptyState v-else compact icon="check" title="No problems" description="Warnings and errors from logs are grouped here." />
  </UiWorkbenchPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {executeCommand} from '../../../shared/command'
import {logState} from '../../../shared/lib/logger'
import {EmptyState, UiActionButton, UiDataGrid, UiStatusBadge, UiWorkbenchPanel, type UiDataGridColumn} from '../../../shared/ui'

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
