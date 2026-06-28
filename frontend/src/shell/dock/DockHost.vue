<template>
  <section v-if="activeDockPanel" class="dock-host dock-host--bottom" :style="dockStyle">
    <div class="dock-host__resize" role="separator" tabindex="0" @pointerdown="startResize" />
    <div class="dock-host__content">
      <component :is="activeDockPanel.component" />
    </div>
    <header class="dock-host__tabs">
      <UiTabs :active-id="workspaceState.activeBottomDockPanel" :items="dockTabItems" label="Dock panels" @activate="activateDockTab" @contextmenu="openDockTabMenu" @reorder="reorderDockPanels" />
      <UiTooltip v-if="activeDockPanel.closable !== false" text="Minimize dock panel">
        <button class="dock-host__close" type="button" aria-label="Minimize dock panel" @click="closeDockPanel"><Minus :size="14" /></button>
      </UiTooltip>
    </header>
  </section>
</template>

<script setup lang="ts">
import {Minus} from '@lucide/vue'
import {computed} from 'vue'
import {reorderDockPanels, setBottomPanelHeight, workspaceState} from '../../entities/workspace'
import {getDockPanels, useBottomDockPanel} from '../../features/workspace/dock-registry'
import {closeDockPanel, openDockPanel} from '../../features/workspace/open-logs-panel'
import {openContextMenu} from '../../shared/context-menu'
import {UiTabs, UiTooltip, type UiTabItem} from '../../shared/ui'

const activeDockPanel = useBottomDockPanel()
const visiblePanels = computed(() =>
  getDockPanels()
    .filter((panel) => panel.placement === 'bottom')
    .sort((left, right) => getDockOrder(left.id) - getDockOrder(right.id) || (left.order ?? 100) - (right.order ?? 100)),
)
const dockTabItems = computed<UiTabItem[]>(() => visiblePanels.value.map((panel) => ({id: panel.id, title: panel.title, icon: panel.icon, subtitle: getDockGroup(panel.id)})))
const dockStyle = computed(() => ({
  '--dock-bottom-height': `${workspaceState.bottomPanelHeight}px`,
}))

function startResize(event: PointerEvent) {
  const startY = event.clientY
  const startHeight = workspaceState.bottomPanelHeight

  function onMove(moveEvent: PointerEvent) {
    setBottomPanelHeight(startHeight - (moveEvent.clientY - startY))
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
  if (panel) openDockPanel(panel.id)
}

function getDockOrder(panelId: string) {
  const index = workspaceState.dockOrder.indexOf(panelId as never)
  return index >= 0 ? index : 999
}

function getDockGroup(panelId: string) {
  if (panelId === 'logs') return 'Diagnostics'
  if (panelId === 'tasks') return 'Background Jobs'
  if (panelId.includes('detail')) return 'Details'
  return 'Dock'
}

function openDockTabMenu(id: string, event: MouseEvent) {
  const panel = visiblePanels.value.find((item) => item.id === id)
  if (!panel) return
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'move-bottom', label: 'Move Dock Bottom', run: () => openDockPanel(panel.id)},
      {id: 'close', label: 'Close', disabled: panel.closable === false, run: closeDockPanel},
    ],
  })
}
</script>
