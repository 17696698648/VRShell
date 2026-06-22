<template>
  <UiTabs class="terminal-tabs" :active-id="terminalState.activeTerminalId" :items="tabItems" label="Terminal tabs" @activate="terminalState.activeTerminalId = $event" @close="handleClose" @reorder="reorderTerminalTabs">
    <template #item="{item}">
      <span>{{ item.title }}</span>
      <UiTooltip :text="item.status === 'connected' ? 'Disconnect terminal' : 'Reconnect terminal'">
        <small @click.stop="toggleConnection(item.id)">{{ item.status === 'connected' ? 'Disconnect' : 'Reconnect' }}</small>
      </UiTooltip>
    </template>
  </UiTabs>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {reorderTerminalTabs, terminalState} from '../../../entities/terminal'
import {closeTerminalTab} from '../../../features/terminal/close-terminal/closeTerminalTab'
import {disconnectTerminalTab, reconnectTerminalTab} from '../../../features/terminal/manage-connection/manageTerminalConnection'
import {UiTabs, UiTooltip, type UiTabItem} from '../../../shared/ui'

const tabItems = computed<UiTabItem[]>(() =>
  terminalState.tabs.map((tab) => ({
    closable: true,
    id: tab.id,
    status: tab.status === 'failed' ? 'error' : tab.status,
    title: tab.title,
  })),
)

function handleClose(id: string) {
  const tab = terminalState.tabs.find((item) => item.id === id)
  if (tab) closeTerminalTab(tab)
}

function toggleConnection(id: string) {
  const tab = terminalState.tabs.find((item) => item.id === id)
  if (!tab) return
  if (tab.status === 'connected') disconnectTerminalTab(tab)
  else reconnectTerminalTab(tab)
}
</script>
