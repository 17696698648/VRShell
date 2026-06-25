<template>
  <aside class="activity-bar-left">
    <div class="activity-bar-left__primary">
      <button
        v-for="item in items"
        :key="item.id"
        :class="['activity-bar-left__item', {active: workspaceState.sidebarVisible && workspaceState.activePanel === item.id}]"
        :data-testid="`activity-${item.id}`"
        :title="item.shortcut ? `${item.title} (${item.shortcut})` : item.tooltip ?? item.title"
        :aria-label="item.title"
        @click="runItem(item)"
      >
        <component :is="item.icon" v-if="typeof item.icon !== 'string'" :size="20" aria-hidden="true" />
        <span v-else aria-hidden="true">{{ item.icon }}</span>
        <small>{{ item.title }}</small>
        <UiBadge v-if="item.badge?.()" class="activity-bar-left__badge" :intent="item.badge?.()?.intent" :title="item.badge?.()?.title" />
      </button>
    </div>
    <button class="activity-bar-left__item activity-bar-left__settings" type="button" data-testid="activity-settings" title="Settings (Ctrl+,)" aria-label="Settings" @click="executeCommand('settings.openPanel')">
      <Settings :size="20" aria-hidden="true" />
      <small>Settings</small>
    </button>
  </aside>
</template>

<script setup lang="ts">
import {workspaceState} from '../../entities/workspace'
import {executeCommand} from '../../shared/command'
import {UiBadge} from '../../shared/ui'
import {useSidebarPanels, type SidebarPanelRegistration} from '../../features/workspace/sidebar-panel-registry'
import {Settings} from '@lucide/vue'

const items = useSidebarPanels()

async function runItem(item: SidebarPanelRegistration) {
  if (item.commandId) await executeCommand(item.commandId)
  else workspaceState.activePanel = item.id
}
</script>
