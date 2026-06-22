<template>
  <UiPanel compact class="problems-panel" aria-label="Problems">
    <UiToolbar label="Problems actions">
      <template #leading>
        <div class="ui-toolbar__title"><strong>Problems</strong><small>{{ problemEntries.length }} warnings/errors</small></div>
      </template>
      <template #trailing>
        <UiTooltip text="Open Logs panel">
          <UiButton size="sm" variant="ghost" @click="openLogsPanel">Open Logs</UiButton>
        </UiTooltip>
      </template>
    </UiToolbar>
    <div v-if="problemEntries.length > 0" class="problems-panel__list">
      <section v-for="group in groupedProblems" :key="group.level" class="problems-panel__group">
        <h3>{{ group.level }} <UiBadge :intent="group.level === 'warning' ? 'warning' : 'danger'">{{ group.entries.length }}</UiBadge></h3>
        <article v-for="entry in group.entries" :key="entry.id" :class="['problems-panel__entry', `problems-panel__entry--${entry.level}`]" title="Open Logs" @click="openLogsPanel">
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
import {openLogsPanel} from '../../../features/workspace/open-logs-panel'
import {logState, type LogEntry} from '../../../shared/lib/logger'
import {EmptyState, UiBadge, UiButton, UiPanel, UiToolbar, UiTooltip} from '../../../shared/ui'

const problemEntries = computed(() => logState.entries.filter((entry) => entry.level === 'warning' || entry.level === 'error' || entry.level === 'fatal'))
const groupedProblems = computed(() => {
  const levels: Array<LogEntry['level']> = ['fatal', 'error', 'warning']
  return levels
    .map((level) => ({level, entries: problemEntries.value.filter((entry) => entry.level === level)}))
    .filter((group) => group.entries.length > 0)
})
</script>
