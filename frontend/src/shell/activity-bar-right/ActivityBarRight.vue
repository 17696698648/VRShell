<template>
  <aside class="activity-bar-right">
    <div class="activity-bar-right__primary">
      <button
        v-for="item in items"
        :key="item.id"
        :class="['activity-bar-right__item', {active: workspaceState.rightPanelVisible && workspaceState.activeRightPanel === item.id}]"
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
  </aside>
</template>

<script setup lang="ts">
import {workspaceState} from '../../entities/workspace'
import {UiBadge} from '../../shared/ui'
import {useRightSidebarPanels, type RightSidebarPanelRegistration} from '../../features/workspace/right-sidebar-panel-registry'
import {switchRightPanel} from '../../entities/workspace'
import {executeCommand} from '../../shared/command'

const items = useRightSidebarPanels()

function runItem(item: RightSidebarPanelRegistration) {
  if (item.commandId) {
    executeCommand(item.commandId)
  } else {
    switchRightPanel(item.id)
  }
}
</script>
