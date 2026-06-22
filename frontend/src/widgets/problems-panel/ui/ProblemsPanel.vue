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
    <div v-if="problemEntries.length > 0" class="problems-panel__list">
      <section v-for="group in groupedProblems" :key="group.level" class="problems-panel__group">
        <h3>{{ group.level }} <UiBadge :intent="group.level === 'warning' ? 'warning' : 'danger'">{{ group.entries.length }}</UiBadge></h3>
        <article v-for="entry in group.entries" :key="entry.id" :class="['problems-panel__entry', `problems-panel__entry--${entry.level}`]" title="Open Logs" @click="executeCommand('workspace.openLogsPanel')">
          <strong>{{ entry.message }}</strong>
          <span>{{ entry.source }} · {{ entry.level }}</span>
          <small v-if="entry.detail">{{ entry.detail }}</small>
        </article>
      </section>
    </div>
    <EmptyState v-else compact icon="✓" title="No problems" description="Warnings and errors from logs are grouped here." />
  </UiPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {executeCommand} from '../../../features/workspace/command-registry'
import {logState, type LogEntry} from '../../../shared/lib/logger'
import {EmptyState, UiActionButton, UiBadge, UiPanel, UiToolbar} from '../../../shared/ui'

const problemEntries = computed(() => logState.entries.filter((entry) => entry.level === 'warning' || entry.level === 'error' || entry.level === 'fatal'))
const groupedProblems = computed(() => {
  const levels: Array<LogEntry['level']> = ['fatal', 'error', 'warning']
  return levels
    .map((level) => ({level, entries: problemEntries.value.filter((entry) => entry.level === level)}))
    .filter((group) => group.entries.length > 0)
})
</script>
