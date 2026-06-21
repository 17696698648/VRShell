<template>
  <section class="output-panel" aria-label="Output">
    <header class="output-panel__header"><div><strong>Output</strong><small>{{ selectedChannel }} channel</small></div><button type="button" @click="clearOutput">Clear</button></header>
    <div class="output-panel__channels"><button v-for="channel in channels" :key="channel" :class="{active: selectedChannel === channel}" type="button" @click="selectedChannel = channel">{{ channel }}</button></div>
    <div v-if="filteredEntries.length > 0" class="output-panel__list"><article v-for="entry in filteredEntries" :key="entry.id"><time>{{ formatTime(entry.timestamp) }}</time><span>{{ entry.message }}</span></article></div>
    <EmptyState v-else compact icon="▣" title="No output" description="Channel output will appear here." />
  </section>
</template>
<script setup lang="ts">
import {computed, ref} from 'vue'
import {clearOutput, outputState, type OutputChannel} from '../../../shared/lib/outputChannels'
import {EmptyState} from '../../../shared/ui'
const channels: OutputChannel[] = ['SSH', 'SFTP', 'Terminal', 'Task', 'IPC', 'UI']
const selectedChannel = ref<OutputChannel>('Terminal')
const filteredEntries = computed(() => outputState.entries.filter((entry) => entry.channel === selectedChannel.value))
function formatTime(timestamp: number) { return new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit'}).format(timestamp) }
</script>
