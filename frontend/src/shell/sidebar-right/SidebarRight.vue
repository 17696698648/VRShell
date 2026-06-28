<template>
  <aside class="sidebar-right" :style="{width: `${width}px`}">
    <button class="workbench-shell__sidebar-right-handle" type="button" aria-label="Resize sidebar" @pointerdown="emit('resize-start', $event)" />
    <header class="sidebar-right__tabs" aria-label="Inspector panels">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        :class="['sidebar-right__tab', {active: workspaceState.activeRightPanel === item.id}]"
        :title="item.tooltip ?? item.title"
        :aria-label="item.title"
        @click="runItem(item)"
      >
        <component :is="item.icon" v-if="typeof item.icon !== 'string'" :size="15" aria-hidden="true" />
        <span v-else aria-hidden="true">{{ item.icon }}</span>
        <strong>{{ item.title }}</strong>
        <UiBadge v-if="item.badge?.()" :intent="item.badge?.()?.intent" :title="item.badge?.()?.title" />
      </button>
    </header>
    <div class="sidebar-right__content">
      <slot>
        <SidebarRightPanelHost/>
      </slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {switchRightPanel, workspaceState} from '../../entities/workspace'
import {useRightSidebarPanels, type RightSidebarPanelRegistration} from '../../features/workspace/right-sidebar-panel-registry'
import {executeCommand} from '../../shared/command'
import {UiBadge} from '../../shared/ui'
import SidebarRightPanelHost from './SidebarRightPanelHost.vue'

defineProps<{
  width: number
}>()

const emit = defineEmits<{
  'resize-start': [event: PointerEvent]
}>()

const items = useRightSidebarPanels()

function runItem(item: RightSidebarPanelRegistration) {
  if (item.commandId) executeCommand(item.commandId)
  else switchRightPanel(item.id)
}
</script>
