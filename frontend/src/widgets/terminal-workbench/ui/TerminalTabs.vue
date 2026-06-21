<template>
  <div class="terminal-tabs">
    <button v-for="tab in terminalState.tabs" :key="tab.id" :class="{active: tab.id === terminalState.activeTerminalId}" @click="terminalState.activeTerminalId = tab.id">
      {{ tab.title }}
      <span>{{ tab.status }}</span>
      <small v-if="tab.status === 'connected'" @click.stop="disconnectTerminalTab(tab)">Disconnect</small>
      <small v-else @click.stop="reconnectTerminalTab(tab)">Reconnect</small>
      <small @click.stop="closeTerminalTab(tab)">Close</small>
    </button>
  </div>
</template>

<script setup lang="ts">
import {terminalState} from '../../../entities/terminal'
import {closeTerminalTab} from '../../../features/terminal/close-terminal/closeTerminalTab'
import {disconnectTerminalTab, reconnectTerminalTab} from '../../../features/terminal/manage-connection/manageTerminalConnection'
</script>
