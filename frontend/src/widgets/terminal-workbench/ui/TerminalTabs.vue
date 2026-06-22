<template>
  <UiTabs class="terminal-tabs" :active-id="terminalState.activeTerminalId" :items="tabItems" label="Terminal tabs" @activate="terminalState.activeTerminalId = $event" @close="handleClose" @contextmenu="openTabMenu" @reorder="reorderTerminalTabs">
    <template #item="{item}">
      <UiInlineStatus :status="item.status === 'error' ? 'error' : item.status" />
      <AlertTriangle v-if="item.status === 'error'" :size="13" class="terminal-tabs__warning" aria-hidden="true" />
      <span>{{ item.title }}</span>
      <UiTooltip :text="item.status === 'connected' ? 'Disconnect terminal' : 'Reconnect terminal'">
        <small @click.stop="toggleConnection(item.id)">{{ item.status === 'connected' ? 'Disconnect' : 'Reconnect' }}</small>
      </UiTooltip>
    </template>
  </UiTabs>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {AlertTriangle} from '@lucide/vue'
import {reorderTerminalTabs, terminalState} from '../../../entities/terminal'
import {closeTerminalTab} from '../../../features/terminal/close-terminal/closeTerminalTab'
import {disconnectTerminalTab, reconnectTerminalTab} from '../../../features/terminal/manage-connection/manageTerminalConnection'
import {executeCommand} from '../../../features/workspace/command-registry'
import {openContextMenu} from '../../../shared/context-menu'
import {UiInlineStatus, UiTabs, UiTooltip, type UiTabItem} from '../../../shared/ui'

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

function openTabMenu(id: string, event: MouseEvent) {
  const tab = terminalState.tabs.find((item) => item.id === id)
  if (!tab) return
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'reconnect', label: 'Reconnect', run: () => reconnectTerminalTab(tab)},
      {id: 'search', label: 'Search\tCtrl+F', run: async () => { terminalState.activeTerminalId = id; await executeCommand('terminal.search') }},
      {id: 'close', label: 'Close', run: () => closeTerminalTab(tab)},
      {id: 'close-others', label: 'Close Others', run: () => terminalState.tabs.filter((item) => item.id !== id).forEach(closeTerminalTab)},
    ],
  })
}
</script>
