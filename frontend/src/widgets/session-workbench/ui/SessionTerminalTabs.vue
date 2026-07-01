<template>
  <div class="session-terminal-tabs-bar">
    <UiTabs class="session-terminal-tabs" :active-id="terminalState.activeTerminalId" :items="tabItems" label="Terminal tabs" @activate="activateTerminalTab" @close="handleClose" @contextmenu="openTabMenu" @reorder="reorderTerminalTabs">
      <template #item="{item}">
        <span class="session-terminal-tabs__identity">
          <AlertTriangle v-if="item.status === 'error'" :size="13" class="session-terminal-tabs__warning" aria-hidden="true" />
          <input
            v-if="renamingId === item.id"
            ref="renameInputRef"
            v-model="renameValue"
            class="session-terminal-tabs__rename-input"
            type="text"
            @blur="commitRename(item.id)"
            @keydown.enter="commitRename(item.id)"
            @keydown.escape="cancelRename"
          />
          <span v-else class="session-terminal-tabs__title" @dblclick.stop="startRename(item)">{{ item.title }}</span>
        </span>
      </template>
    </UiTabs>
    <button class="session-terminal-tabs__add" type="button" title="New terminal" aria-label="New terminal" @click="openAdditionalTerminal">
      <Plus :size="14" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, ref} from 'vue'
import {AlertTriangle, Plus} from '@lucide/vue'
import {setActiveSession} from '../../../entities/session'
import {reorderTerminalTabs, terminalState} from '../../../entities/terminal'
import {closeTerminalTab} from '../../../features/terminal/close-terminal/closeTerminalTab'
import {reconnectTerminalTab} from '../../../features/terminal/manage-connection/manageTerminalConnection'
import {executeCommand} from '../../../shared/command'
import {openContextMenu} from '../../../shared/context-menu'
import {messages} from '../../../shared/copy'
import {UiTabs, type UiTabItem} from '../../../shared/ui'
import {useSessionWorkbench} from '../model/useSessionWorkbench'

const {currentSessionTerminals, openAdditionalTerminal} = useSessionWorkbench()

const customTitles = ref(new Map<string, string>())
const renamingId = ref<string | null>(null)
const renameValue = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

const tabItems = computed<UiTabItem[]>(() =>
  currentSessionTerminals.value.map((tab, index) => ({
    closable: true,
    id: tab.id,
    status: tab.status === 'failed' ? 'error' : tab.status === 'disconnecting' ? 'connecting' : tab.status,
    title: customTitles.value.get(tab.id) ?? `terminal${index + 1}`,
    tooltip: getTabTooltip(tab, customTitles.value.get(tab.id) ?? `terminal${index + 1}`),
  })),
)

function startRename(item: UiTabItem) {
  renamingId.value = item.id
  renameValue.value = item.title
  void nextTick(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  })
}

function commitRename(tabId: string) {
  const trimmed = renameValue.value.trim()
  if (trimmed && trimmed !== tabItems.value.find((t) => t.id === tabId)?.title) {
    customTitles.value.set(tabId, trimmed)
  }
  renamingId.value = null
}

function cancelRename() {
  renamingId.value = null
}

function handleClose(id: string) {
  const tab = currentSessionTerminals.value.find((item) => item.id === id)
  if (tab) closeTerminalTab(tab, {skipConfirm: true})
}

function activateTerminalTab(id: string) {
  terminalState.activeTerminalId = id
  const tab = terminalState.tabs.find((item) => item.id === id)
  if (tab) setActiveSession(tab.sessionId)
}

function openTabMenu(id: string, event: MouseEvent) {
  const tab = currentSessionTerminals.value.find((item) => item.id === id)
  if (!tab) return
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'reconnect', label: messages.reconnect.action, run: () => reconnectTerminalTab(tab)},
      {id: 'new-terminal', label: 'New Terminal', run: () => openAdditionalTerminal()},
      {id: 'search', label: 'Search\tCtrl+F', run: async () => { terminalState.activeTerminalId = id; await executeCommand('terminal.search') }},
      {id: 'close', label: 'Close', run: () => closeTerminalTab(tab, {skipConfirm: true})},
      {id: 'close-others', label: 'Close Others', run: () => currentSessionTerminals.value.filter((item) => item.id !== id).forEach((item) => closeTerminalTab(item, {skipConfirm: true}))},
      {id: 'close-all', label: 'Close All', danger: true, run: () => { for (const item of [...currentSessionTerminals.value]) closeTerminalTab(item, {skipConfirm: true}) }},
    ],
  })
}

function getTabTooltip(tab: {title: string; status: string; cwd: string}, title: string) {
  if (tab.status === 'failed' || tab.status === 'disconnected') return `${title} · ${messages.reconnect.terminalDisconnected(tab.title)}`
  return `${title} · ${tab.status}${tab.cwd ? ` · ${tab.cwd}` : ''}`
}
</script>
