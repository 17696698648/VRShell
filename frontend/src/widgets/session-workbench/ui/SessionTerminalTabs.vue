<template>
  <div class="session-terminal-tabs-bar">
    <UiTabs class="session-terminal-tabs" :active-id="terminalState.activeTerminalId" :items="tabItems" label="Terminal tabs" @activate="terminalState.activeTerminalId = $event" @close="handleClose" @contextmenu="openTabMenu" @reorder="reorderTerminalTabs">
      <template #item="{item}">
        <span class="session-terminal-tabs__identity">
          <AlertTriangle v-if="item.status === 'error'" :size="13" class="session-terminal-tabs__warning" aria-hidden="true" />
          <span class="session-terminal-tabs__title">{{ item.title }}</span>
        </span>
      </template>
    </UiTabs>
    <button class="session-terminal-tabs__add" type="button" title="New terminal" aria-label="New terminal" @click="openAdditionalTerminal">
      <Plus :size="14" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {AlertTriangle, Plus} from '@lucide/vue'
import {reorderTerminalTabs, terminalState} from '../../../entities/terminal'
import {closeTerminalTab} from '../../../features/terminal/close-terminal/closeTerminalTab'
import {reconnectTerminalTab} from '../../../features/terminal/manage-connection/manageTerminalConnection'
import {executeCommand} from '../../../shared/command'
import {openContextMenu} from '../../../shared/context-menu'
import {UiTabs, type UiTabItem} from '../../../shared/ui'
import {useSessionWorkbench} from '../model/useSessionWorkbench'

const {currentSessionTerminals, openAdditionalTerminal} = useSessionWorkbench()
const tabItems = computed<UiTabItem[]>(() =>
  currentSessionTerminals.value.map((tab, index) => ({
    closable: true,
    id: tab.id,
    status: tab.status === 'failed' ? 'error' : tab.status,
    title: `terminal${index + 1}`,
  })),
)

function handleClose(id: string) {
  const tab = currentSessionTerminals.value.find((item) => item.id === id)
  if (tab) closeTerminalTab(tab, {skipConfirm: true})
}

function openTabMenu(id: string, event: MouseEvent) {
  const tab = currentSessionTerminals.value.find((item) => item.id === id)
  if (!tab) return
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'reconnect', label: 'Reconnect', run: () => reconnectTerminalTab(tab)},
      {id: 'new-terminal', label: 'New Terminal', run: () => openAdditionalTerminal()},
      {id: 'search', label: 'Search\tCtrl+F', run: async () => { terminalState.activeTerminalId = id; await executeCommand('terminal.search') }},
      {id: 'close', label: 'Close', run: () => closeTerminalTab(tab, {skipConfirm: true})},
      {id: 'close-others', label: 'Close Others', run: () => currentSessionTerminals.value.filter((item) => item.id !== id).forEach((item) => closeTerminalTab(item, {skipConfirm: true}))},
    ],
  })
}
</script>
