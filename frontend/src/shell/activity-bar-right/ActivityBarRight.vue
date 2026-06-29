<template>
  <aside class="activity-bar-right">
    <div class="activity-bar-right__primary">
      <button
        v-for="item in items"
        :key="item.id"
        :class="['activity-bar-right__item', {
          'is-expanded': workspaceState.rightPanelVisible && workspaceState.activeRightPanel === item.id,
          'is-current': workspaceState.rightPanelVisible && workspaceState.activeRightPanel === item.id && workspaceState.activePanelRegion === 'right',
        }]"
        :title="item.tooltip ?? item.title"
        :aria-label="item.title"
        @click="runItem(item)"
      >
        <component :is="item.icon" v-if="typeof item.icon !== 'string'" :size="20" aria-hidden="true" />
        <span v-else aria-hidden="true">{{ item.icon }}</span>
        <small>{{ item.title }}</small>
        <UiBadge v-if="item.badge?.()" class="activity-bar-right__badge" :intent="item.badge?.()?.intent" :title="item.badge?.()?.title" />
      </button>
    </div>
    <div class="activity-bar-right__secondary">
      <button
        :class="['activity-bar-right__item', {
          'is-expanded': workspaceState.bottomPanelVisible && workspaceState.activeBottomDockPanel === 'logs',
          'is-current': isCurrentDockPanel('logs'),
        }]"
        type="button"
        title="Log Center"
        aria-label="Log Center"
        @click="toggleDockPanel('logs')"
      >
        <Info :size="20" aria-hidden="true" />
        <small>Log Center</small>
      </button>
      <button
        :class="['activity-bar-right__item', {
          'is-expanded': workspaceState.bottomPanelVisible && workspaceState.activeBottomDockPanel === 'tasks',
          'is-current': isCurrentDockPanel('tasks'),
        }]"
        type="button"
        title="Task Queue"
        aria-label="Task Queue"
        @click="toggleDockPanel('tasks')"
      >
        <BellDot :size="20" aria-hidden="true" />
        <small>Task Queue</small>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {BellDot, Info} from '@lucide/vue'
import {workspaceState, type WorkspaceDockPanel} from '../../entities/workspace'
import {closeDockPanel, openDockPanel} from '../../features/workspace/open-logs-panel'
import {UiBadge} from '../../shared/ui'
import {useRightSidebarPanels, type RightSidebarPanelRegistration} from '../../features/workspace/right-sidebar-panel-registry'
import {switchRightPanel} from '../../entities/workspace'
import {executeCommand} from '../../shared/command'

const items = useRightSidebarPanels()

function runItem(item: RightSidebarPanelRegistration) {
  workspaceState.activePanelRegion = 'right'
  if (item.commandId) {
    executeCommand(item.commandId)
  } else {
    switchRightPanel(item.id)
  }
}

function toggleDockPanel(panel: Exclude<WorkspaceDockPanel, 'none'>) {
  workspaceState.activePanelRegion = 'main'
  if (workspaceState.bottomPanelVisible && workspaceState.activeBottomDockPanel === panel) {
    closeDockPanel()
    return
  }
  openDockPanel(panel)
}

function isCurrentDockPanel(panel: Exclude<WorkspaceDockPanel, 'none'>) {
  return workspaceState.bottomPanelVisible && workspaceState.activeBottomDockPanel === panel && workspaceState.activePanelRegion === 'main'
}
</script>
