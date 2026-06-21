<template>
  <section v-if="activeDockPanel" :class="['dock-host', `dock-host--${workspaceState.panelPlacement}`]" :style="dockStyle">
    <div class="dock-host__resize" role="separator" tabindex="0" @pointerdown="startResize" />
    <header class="dock-host__tabs">
      <button
        v-for="panel in visiblePanels"
        :key="panel.id"
        :class="{active: panel.id === workspaceState.activeDockPanel}"
        type="button"
        @click="openDockPanel(panel.id, panel.placement)"
      >
        <span v-if="panel.icon" aria-hidden="true">{{ panel.icon }}</span>
        {{ panel.title }}
      </button>
      <button v-if="activeDockPanel.closable !== false" class="dock-host__close" type="button" @click="closeDockPanel">Close</button>
    </header>
    <component :is="activeDockPanel.component" />
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {setBottomPanelHeight, setRightDockWidth, workspaceState} from '../../entities/workspace'
import {getDockPanels, useActiveDockPanel} from '../../features/workspace/dock-registry'
import {closeDockPanel, openDockPanel} from '../../features/workspace/open-logs-panel'

const activeDockPanel = useActiveDockPanel()
const visiblePanels = computed(() => getDockPanels().filter((panel) => panel.placement === workspaceState.panelPlacement).sort((left, right) => (left.order ?? 100) - (right.order ?? 100)))
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
</script>
