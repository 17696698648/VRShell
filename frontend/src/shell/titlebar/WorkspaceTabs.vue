<template>
  <UiTabs class="workspace-tabs" :active-id="activeTabId" :items="tabItems" label="Workspace tabs" @activate="activateTabById" @close="closeWorkspaceTab" @contextmenu="openTabMenu" @reorder="reorderWorkspaceTabs" />
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {terminalState} from '../../entities/terminal'
import {activateWorkspaceTab, closeWorkspaceTab, reorderWorkspaceTabs, workspaceState, workspaceTabs, type WorkspaceTab} from '../../entities/workspace'
import {openContextMenu} from '../../shared/context-menu'
import {UiTabs, type UiTabItem} from '../../shared/ui'

const activeTabId = computed(() => workspaceTabs.value.find(isActive)?.id ?? null)
const tabItems = computed<UiTabItem[]>(() =>
  workspaceTabs.value.map((tab) => ({
    closable: tab.closable !== false && !tab.pinned,
    dirty: tab.dirty,
    id: tab.id,
    pinned: tab.pinned,
    status: toUiTabStatus(tab.status),
    subtitle: tab.subtitle,
    title: tab.title,
  })),
)

function isActive(tab: WorkspaceTab) {
  if (tab.kind === 'terminal') return workspaceState.activeMainView === 'workbench' && tab.id === terminalState.activeTerminalId
  return tab.id === 'settings' && workspaceState.activeMainView === 'settings'
}

function activateTabById(id: string) {
  activateWorkspaceTab(id)
}

function openTabMenu(id: string, event: MouseEvent) {
  const tab = workspaceTabs.value.find((item) => item.id === id)
  if (!tab) return
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'activate', label: 'Activate', run: () => activateWorkspaceTab(id)},
      {id: 'close', label: 'Close', disabled: tab.closable === false || tab.pinned, run: () => closeWorkspaceTab(id)},
      {id: 'close-others', label: 'Close Others', run: () => workspaceTabs.value.filter((item) => item.id !== id && item.closable !== false && !item.pinned).forEach((item) => closeWorkspaceTab(item.id))},
    ],
  })
}

function toUiTabStatus(status: string | undefined): UiTabItem['status'] {
  if (status === 'failed') return 'error'
  if (status === 'connecting' || status === 'connected' || status === 'warning' || status === 'error' || status === 'disconnected') return status
  return undefined
}
</script>
