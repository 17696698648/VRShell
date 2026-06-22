<template>
  <section v-if="activeDockPanel" :class="['dock-host', `dock-host--${workspaceState.panelPlacement}`]" :style="dockStyle">
    <div class="dock-host__resize" role="separator" tabindex="0" @pointerdown="startResize" />
    <header class="dock-host__tabs">
      <UiTabs :active-id="workspaceState.activeDockPanel" :items="dockTabItems" label="Dock panels" @activate="activateDockTab" />
      <UiTooltip v-if="activeDockPanel.closable !== false" text="Close dock panel">
        <UiButton class="dock-host__close" size="sm" variant="ghost" @click="closeDockPanel">Close</UiButton>
      </UiTooltip>
    </header>
    <component :is="activeDockPanel.component" />
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {setBottomPanelHeight, setRightDockWidth, workspaceState} from '../../entities/workspace'
import {getDockPanels, useActiveDockPanel} from '../../features/workspace/dock-registry'
import {closeDockPanel, openDockPanel} from '../../features/workspace/open-logs-panel'
import {UiButton, UiTabs, UiTooltip, type UiTabItem} from '../../shared/ui'

const activeDockPanel = useActiveDockPanel()
const visiblePanels = computed(() => getDockPanels().filter((panel) => panel.placement === workspaceState.panelPlacement).sort((left, right) => (left.order ?? 100) - (right.order ?? 100)))
const dockTabItems = computed<UiTabItem[]>(() => visiblePanels.value.map((panel) => ({id: panel.id, title: panel.title, icon: panel.icon})))
const dockStyle = computed(() => ({
  '--dock-bottom-height': `${workspaceState.bottomPanelHeight}px`,
  '--dock-right-width': `${workspaceState.rightDockWidth}px`,
}))

function startResize(event: PointerEvent) {
  const startX = event.clientX
  const startY = event.clientY
  const startHeight = workspaceState.bottomPanelHeight
  const startWidth = workspaceState.rightDockWidth

  function onMove(moveEvent: PointerEvent) {
    if (workspaceState.panelPlacement === 'right') setRightDockWidth(startWidth - (moveEvent.clientX - startX))
    else setBottomPanelHeight(startHeight - (moveEvent.clientY - startY))
  }

  function onEnd() {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onEnd)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onEnd)
}

function activateDockTab(id: string) {
  const panel = visiblePanels.value.find((item) => item.id === id)
  if (panel) openDockPanel(panel.id, panel.placement)
}
</script>
