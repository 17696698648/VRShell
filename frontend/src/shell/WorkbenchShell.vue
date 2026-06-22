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
import {computed} from 'vue'
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

const sidebarStyle = computed(() => ({width: `${workspaceState.sidebarWidth}px`}))

function startSidebarResize(event: PointerEvent) {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = workspaceState.sidebarWidth

  function move(pointerEvent: PointerEvent) {
    setSidebarWidth(startWidth + pointerEvent.clientX - startX)
  }

  function end(pointerEvent: PointerEvent) {
    move(pointerEvent)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}
</script>
