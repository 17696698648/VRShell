<template>
  <div class="workbench-shell" data-testid="app-shell">
    <AppTitlebar/>
    <div class="workbench-shell__body" :class="{'workbench-shell__body--no-sidebar': !workspaceState.sidebarVisible, 'workbench-shell__body--right-open': rightToolWindowOpen}">
      <ActivityBar/>
      <button v-if="workspaceState.sidebarVisible" class="workbench-shell__sidebar-backdrop" type="button" aria-label="Close sidebar" @click="workspaceState.sidebarVisible = false" />
      <Transition name="sidebar-slide">
        <div v-if="workspaceState.sidebarVisible" class="workbench-shell__sidebar-resize" :style="sidebarStyle">
          <Sidebar :width="workspaceState.sidebarWidth" @resize-start="startSidebarResize">
            <slot name="sidebar"/>
          </Sidebar>
        </div>
      </Transition>
      <main class="workbench-shell__main">
        <slot name="main">
          <slot/>
        </slot>
      </main>
      <RightToolWindow/>
      <RightSider/>
    </div>
    <StatusBar/>
    <CommandPaletteHost/>
    <QuickOpenHost/>
    <SettingsDialogHost/>
    <ContextMenuHost/>
    <DialogHost/>
    <HostKeyDialogHost/>
    <ToastHost/>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {setSidebarWidth, workspaceState} from '../entities/workspace'
import ActivityBar from './activity-bar/ActivityBar.vue'
import CommandPaletteHost from './overlays/CommandPaletteHost.vue'
import ContextMenuHost from './overlays/ContextMenuHost.vue'
import DialogHost from './overlays/DialogHost.vue'
import HostKeyDialogHost from './overlays/HostKeyDialogHost.vue'
import QuickOpenHost from './overlays/QuickOpenHost.vue'
import SettingsDialogHost from './overlays/SettingsDialogHost.vue'
import ToastHost from './overlays/ToastHost.vue'
import RightSider from './dock/RightSider.vue'
import RightToolWindow from './dock/RightToolWindow.vue'
import Sidebar from './sidebar/Sidebar.vue'
import StatusBar from './status-bar/StatusBar.vue'
import AppTitlebar from './titlebar/AppTitlebar.vue'

const resizingSidebarWidth = ref<number | null>(null)
const sidebarStyle = computed(() => ({width: `${resizingSidebarWidth.value ?? workspaceState.sidebarWidth}px`}))
const rightToolWindowOpen = computed(() => workspaceState.rightPanelVisible && workspaceState.activeRightDockPanel !== 'none')

onMounted(() => window.addEventListener('keydown', closeSidebarWithEscape))
onUnmounted(() => window.removeEventListener('keydown', closeSidebarWithEscape))

function startSidebarResize(event: PointerEvent) {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = workspaceState.sidebarWidth
  document.body.classList.add('is-resizing')

  function move(pointerEvent: PointerEvent) {
    resizingSidebarWidth.value = clampSidebarWidth(startWidth + pointerEvent.clientX - startX)
    document.body.style.setProperty('--resize-guide-x', `${pointerEvent.clientX}px`)
  }

  function end(pointerEvent: PointerEvent) {
    move(pointerEvent)
    if (resizingSidebarWidth.value !== null) setSidebarWidth(resizingSidebarWidth.value)
    resizingSidebarWidth.value = null
    document.body.classList.remove('is-resizing')
    document.body.style.removeProperty('--resize-guide-x')
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

function clampSidebarWidth(width: number) {
  return Math.min(420, Math.max(220, Math.round(width)))
}

function closeSidebarWithEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && window.matchMedia('(max-width: 900px)').matches) workspaceState.sidebarVisible = false
}
</script>
