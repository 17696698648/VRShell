<template>
  <section class="output-panel" aria-label="Output">
    <header class="output-panel__header">
      <div><strong>Output</strong><small>{{ selectedChannel }} channel</small></div>
      <div class="panel__actions"><button type="button" @click="paused = !paused">{{ paused ? 'Resume' : 'Pause' }}</button><button type="button" @click="clearOutput">Clear</button></div>
    </header>
    <div class="output-panel__channels"><button v-for="channel in channels" :key="channel.id" :class="{active: selectedChannel === channel.id}" type="button" @click="selectedChannel = channel.id">{{ channel.title }}</button></div>
    <pre v-if="visibleEntries.length > 0" class="output-panel__terminal"><code><template v-for="entry in visibleEntries" :key="entry.id">[{{ formatTime(entry.timestamp) }}] {{ entry.message }}
</template></code></pre>
    <EmptyState v-else compact icon="▣" title="No output" description="Channel output will appear here." />
  </section>
</template>
<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useOutputChannels} from '../../../features/workspace/output-channel-registry'
import {clearOutput, outputState, type OutputChannel, type OutputEntry} from '../../../shared/lib/outputChannels'
import {EmptyState} from '../../../shared/ui'
const channels = useOutputChannels()
const selectedChannel = ref<OutputChannel>('Terminal')
const paused = ref(false)
const snapshot = ref<OutputEntry[]>([])
const filteredEntries = computed(() => outputState.entries.filter((entry) => entry.channel === selectedChannel.value).slice().reverse())
const visibleEntries = computed(() => paused.value ? snapshot.value : filteredEntries.value)
watch([filteredEntries, paused], () => {
  if (!paused.value) snapshot.value = filteredEntries.value
}, {immediate: true})
function formatTime(timestamp: number) { return new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit'}).format(timestamp) }
</script>
