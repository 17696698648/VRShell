<template>
  <nav class="workspace-tabs" aria-label="Workspace tabs">
    <button v-for="tab in workspaceTabs" :key="tab.id" :class="['workspace-tab', {active: isActive(tab), dirty: tab.dirty} ]" @click="activateTab(tab)">
      <span class="workspace-tab__dot" :class="tab.status" />
      {{ tab.title }}
      <span v-if="tab.subtitle" class="workspace-tab__cwd">{{ tab.subtitle }}</span>
      <small v-if="tab.closable !== false && !tab.pinned" title="Close tab" @click.stop="closeWorkspaceTab(tab.id)">×</small>
    </button>
  </nav>
</template>

<script setup lang="ts">
import {terminalState} from '../../entities/terminal'
import {activateWorkspaceTab, closeWorkspaceTab, workspaceState, workspaceTabs, type WorkspaceTab} from '../../entities/workspace'

function isActive(tab: WorkspaceTab) {
  if (tab.kind === 'terminal') return workspaceState.activeMainView === 'workbench' && tab.id === terminalState.activeTerminalId
  return tab.id === 'settings' && workspaceState.activeMainView === 'settings'
}

function activateTab(tab: WorkspaceTab) {
  activateWorkspaceTab(tab.id)
}
</script>
