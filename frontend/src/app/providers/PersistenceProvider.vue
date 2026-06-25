<template><slot /></template>

<script setup lang="ts">
import {onBeforeUnmount, watch} from 'vue'
import {sessionState} from '../../entities/session'
import {workspaceState} from '../../entities/workspace'
import {persistState} from '../lifecycle/persistence'

let persistenceTimer: ReturnType<typeof window.setTimeout> | null = null

const stopPersistence = watch(
  () => [
    sessionState.activeSessionId,
    sessionState.groups,
    sessionState.sessions,
    workspaceState.activeBottomDockPanel,
    workspaceState.activeMainView,
    workspaceState.activePanel,
    workspaceState.activeRightPanel,
    workspaceState.bottomPanelHeight,
    workspaceState.bottomPanelVisible,
    workspaceState.compactMode,
    workspaceState.density,
    workspaceState.dockOrder,
    workspaceState.layoutPreset,
    workspaceState.mainAreaMode,
    workspaceState.mainSplitRatio,
    workspaceState.panelPlacement,
    workspaceState.recentBottomDockPanel,
    workspaceState.recentRightPanel,
    workspaceState.rightPanelVisible,
    workspaceState.rightPanelWidth,
    workspaceState.sidebarVisible,
    workspaceState.sidebarWidth,
    workspaceState.theme,
  ],
  schedulePersistState,
  {deep: true},
)

window.addEventListener('beforeunload', persistState)

onBeforeUnmount(() => {
  if (persistenceTimer) window.clearTimeout(persistenceTimer)
  stopPersistence()
  window.removeEventListener('beforeunload', persistState)
})

function schedulePersistState() {
  if (persistenceTimer) window.clearTimeout(persistenceTimer)
  persistenceTimer = window.setTimeout(() => {
    persistenceTimer = null
    persistState()
  }, 120)
}
</script>
