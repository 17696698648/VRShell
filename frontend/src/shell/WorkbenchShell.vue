<template>
  <div class="workbench-shell">
    <AppTitlebar/>
    <div class="workbench-shell__body">
      <ActivityBar/>
      <div v-if="workspaceState.sidebarVisible" class="workbench-shell__sidebar-resize" :style="sidebarStyle">
        <Sidebar :width="workspaceState.sidebarWidth">
          <slot name="sidebar"/>
        </Sidebar>
        <button class="workbench-shell__sidebar-handle" type="button" aria-label="Resize sidebar" @pointerdown="startSidebarResize" />
      </div>
      <main class="workbench-shell__main">
        <slot name="main">
          <slot/>
        </slot>
      </main>
    </div>
    <StatusBar/>
    <CommandPaletteHost/>
    <QuickOpenHost/>
    <ContextMenuHost/>
    <DialogHost/>
    <ToastHost/>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {setSidebarWidth, workspaceState} from '../entities/workspace'
import ActivityBar from './activity-bar/ActivityBar.vue'
import CommandPaletteHost from './overlays/CommandPaletteHost.vue'
import ContextMenuHost from './overlays/ContextMenuHost.vue'
import DialogHost from './overlays/DialogHost.vue'
import QuickOpenHost from './overlays/QuickOpenHost.vue'
import ToastHost from './overlays/ToastHost.vue'
import Sidebar from './sidebar/Sidebar.vue'
import StatusBar from './status-bar/StatusBar.vue'
import AppTitlebar from './titlebar/AppTitlebar.vue'

const resizingSidebarWidth = ref<number | null>(null)
const sidebarStyle = computed(() => ({width: `${resizingSidebarWidth.value ?? workspaceState.sidebarWidth}px`}))

function startSidebarResize(event: PointerEvent) {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = workspaceState.sidebarWidth

  function move(pointerEvent: PointerEvent) {
    resizingSidebarWidth.value = clampSidebarWidth(startWidth + pointerEvent.clientX - startX)
  }

  function end(pointerEvent: PointerEvent) {
    move(pointerEvent)
    if (resizingSidebarWidth.value !== null) setSidebarWidth(resizingSidebarWidth.value)
    resizingSidebarWidth.value = null
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

function clampSidebarWidth(width: number) {
  return Math.min(420, Math.max(220, Math.round(width)))
}
</script>
