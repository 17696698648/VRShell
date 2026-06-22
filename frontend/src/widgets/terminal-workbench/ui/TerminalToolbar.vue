<template>
  <UiToolbar class="terminal-toolbar" label="Terminal actions" bordered>
    <template #leading>
      <span>{{ connectedCount }}/{{ terminalState.tabs.length }} connected</span>
    </template>
    <template #trailing>
      <UiTooltip text="Reconnect active terminal">
        <UiActionButton command-id="terminal.reconnectActive" :icon="RefreshCw" label="Reconnect" tooltip="Reconnect active terminal" />
      </UiTooltip>
      <UiTooltip text="Search terminal output" shortcut="Ctrl+F">
        <UiActionButton command-id="terminal.search" :icon="Search" label="Search" />
      </UiTooltip>
      <UiTooltip text="Broadcast command to connected terminals">
        <UiActionButton command-id="terminal.broadcastCommand" :icon="RadioTower" label="Broadcast" variant="secondary" />
      </UiTooltip>
    </template>
  </UiToolbar>
</template>

<script setup lang="ts">
import {RadioTower, RefreshCw, Search} from '@lucide/vue'
import {computed} from 'vue'
import {terminalState} from '../../../entities/terminal'
import {UiActionButton, UiToolbar, UiTooltip} from '../../../shared/ui'

const activeTerminal = computed(() => terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId) ?? null)
const connectedCount = computed(() => terminalState.tabs.filter((tab) => tab.status === 'connected').length)
</script>
