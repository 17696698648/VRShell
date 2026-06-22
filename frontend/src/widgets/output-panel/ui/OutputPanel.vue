<template>
  <UiPanel compact class="output-panel" aria-label="Output">
    <UiToolbar label="Output actions">
      <template #leading>
        <div class="ui-toolbar__title"><strong>Output</strong><small>{{ selectedChannel }} channel</small></div>
      </template>
      <template #trailing>
        <UiTooltip :text="paused ? 'Resume live output' : 'Pause live output'">
          <UiButton size="sm" variant="ghost" @click="paused = !paused">{{ paused ? 'Resume' : 'Pause' }}</UiButton>
        </UiTooltip>
        <UiTooltip text="Clear output entries">
          <UiButton size="sm" variant="ghost" @click="clearOutput">Clear</UiButton>
        </UiTooltip>
      </template>
    </UiToolbar>
    <div class="output-panel__channels"><button v-for="channel in channels" :key="channel.id" :class="{active: selectedChannel === channel.id}" type="button" @click="selectedChannel = channel.id">{{ channel.title }}</button></div>
    <pre v-if="visibleEntries.length > 0" class="output-panel__terminal"><code><template v-for="entry in visibleEntries" :key="entry.id">[{{ formatTime(entry.timestamp) }}] {{ entry.message }}
</template></code></pre>
    <EmptyState v-else compact icon="▣" title="No output" description="Channel output will appear here." />
  </UiPanel>
</template>
<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useOutputChannels} from '../../../features/workspace/output-channel-registry'
import {clearOutput, outputState, type OutputChannel, type OutputEntry} from '../../../shared/lib/outputChannels'
import {EmptyState, UiButton, UiPanel, UiToolbar, UiTooltip} from '../../../shared/ui'
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
