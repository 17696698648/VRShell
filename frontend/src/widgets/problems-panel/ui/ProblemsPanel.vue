<template>
  <section class="problems-panel" aria-label="Problems">
    <header class="problems-panel__header">
      <div>
        <strong>Problems</strong>
        <small>{{ problemEntries.length }} warnings/errors</small>
      </div>
      <button type="button" @click="openLogsPanel">Open Logs</button>
    </header>
    <div v-if="problemEntries.length > 0" class="problems-panel__list">
      <article v-for="entry in problemEntries" :key="entry.id" :class="['problems-panel__entry', `problems-panel__entry--${entry.level}`]">
        <strong>{{ entry.message }}</strong>
        <span>{{ entry.source }} · {{ entry.level }}</span>
        <small v-if="entry.detail">{{ entry.detail }}</small>
      </article>
    </div>
    <EmptyState v-else compact icon="✓" title="No problems" description="Warnings and errors from logs are grouped here." />
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {openLogsPanel} from '../../../features/workspace/open-logs-panel'
import {logState} from '../../../shared/lib/logger'
import {EmptyState} from '../../../shared/ui'

const problemEntries = computed(() => logState.entries.filter((entry) => entry.level === 'warning' || entry.level === 'error' || entry.level === 'fatal'))
</script>
