<template>
  <aside class="right-sider" aria-label="Right tool windows">
    <button
      v-for="item in items"
      :key="item.id"
      :class="['right-sider__item', {active: workspaceState.rightPanelVisible && workspaceState.activeRightDockPanel === item.id}]"
      type="button"
      :title="item.title"
      :aria-label="item.title"
      @click="activateRightPanel(item.id)"
    >
      <component :is="getPanelIcon(item.id)" :size="16" aria-hidden="true" />
    </button>
  </aside>
</template>

<script setup lang="ts">
import {AlertCircle, FileText, Info, ListTodo, Server, TerminalSquare} from '@lucide/vue'
import {computed} from 'vue'
import {workspaceState, type WorkspaceDockPanel} from '../../entities/workspace'
import {getDockPanels} from '../../features/workspace/dock-registry'
import {openDockPanel} from '../../features/workspace/open-logs-panel'

const items = computed(() =>
  getDockPanels()
    .filter((panel) => panel.placement === 'right')
    .sort((left, right) => (left.order ?? 100) - (right.order ?? 100)),
)

function getPanelIcon(id: Exclude<WorkspaceDockPanel, 'none'>) {
  if (id === 'session-detail') return Server
  if (id === 'sftp-item-detail') return FileText
  if (id === 'task-detail') return ListTodo
  if (id === 'terminal-info') return TerminalSquare
  if (id === 'problems') return AlertCircle
  return Info
}

function activateRightPanel(id: Exclude<WorkspaceDockPanel, 'none'>) {
  if (workspaceState.rightPanelVisible && workspaceState.activeRightDockPanel === id) {
    workspaceState.rightPanelVisible = false
    workspaceState.activeRightDockPanel = 'none'
    return
  }
  openDockPanel(id, 'right')
}
</script>
