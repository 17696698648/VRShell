<template>
  <div class="terminal-toolbar" aria-label="Terminal actions">
    <button type="button" :disabled="!activeTerminal" title="Reconnect active terminal" @click="reconnectActiveTerminal">Reconnect</button>
    <button type="button" :disabled="!activeTerminal" title="Search terminal output" @click="toggleTerminalSearch">Search</button>
    <button type="button" :disabled="connectedCount === 0" title="Broadcast command to connected terminals" @click="promptBroadcast">Broadcast</button>
    <span>{{ connectedCount }}/{{ terminalState.tabs.length }} connected</span>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {terminalState} from '../../../entities/terminal'
import {broadcastTerminalCommand} from '../../../features/terminal/broadcast-command'
import {reconnectTerminalTab} from '../../../features/terminal/manage-connection/manageTerminalConnection'
import {toggleTerminalSearch} from '../../../features/terminal/search-terminal/searchTerminal'
import {requestPrompt} from '../../../shared/dialog'

const activeTerminal = computed(() => terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId) ?? null)
const connectedCount = computed(() => terminalState.tabs.filter((tab) => tab.status === 'connected').length)

async function reconnectActiveTerminal() {
  if (activeTerminal.value) await reconnectTerminalTab(activeTerminal.value)
}

async function promptBroadcast() {
  const command = await requestPrompt({title: 'Broadcast command', label: 'Command', confirmLabel: 'Broadcast'})
  if (command) await broadcastTerminalCommand(command)
}
</script>
