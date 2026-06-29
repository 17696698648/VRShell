<template>
  <div class="workbench-shell" data-testid="app-shell">
    <AppTitlebar/>
    <div class="workbench-shell__workspace" :class="bodyClasses">
      <ActivityBarLeft/>
      <button v-if="workspaceState.sidebarVisible" class="workbench-shell__sidebar-left-backdrop" type="button" aria-label="Close sidebar" @click="workspaceState.sidebarVisible = false" />
      <section class="workbench-shell__stage" :class="{'workbench-shell__stage--has-dock': dockVisible}">
        <div ref="sidebarLeftRef" v-if="workspaceState.sidebarVisible" class="workbench-shell__sidebar-left-resize" :style="sidebarLeftStyle" @focusin.capture="workspaceState.activePanelRegion = 'left'" @pointerdown.capture="workspaceState.activePanelRegion = 'left'">
          <SidebarLeft>
            <slot name="sidebar-left"/>
          </SidebarLeft>
        </div>
        <button v-if="workspaceState.sidebarVisible" class="workbench-shell__sidebar-left-handle" type="button" aria-label="Resize sidebar" @pointerdown="startSidebarLeftResize" />
        <main class="workbench-shell__main" @focusin.capture="workspaceState.activePanelRegion = 'main'" @pointerdown.capture="workspaceState.activePanelRegion = 'main'">
          <slot name="main">
            <slot/>
          </slot>
        </main>
        <button v-if="workspaceState.rightPanelVisible" class="workbench-shell__sidebar-right-handle" type="button" aria-label="Resize sidebar" @pointerdown="startSidebarRightResize" />
        <div ref="sidebarRightRef" v-if="workspaceState.rightPanelVisible" class="workbench-shell__sidebar-right-resize" :style="sidebarRightStyle" @focusin.capture="workspaceState.activePanelRegion = 'right'" @pointerdown.capture="workspaceState.activePanelRegion = 'right'">
          <SidebarRight>
            <slot name="sidebar-right"/>
          </SidebarRight>
        </div>
        <button v-if="dockVisible && $slots.dock" class="workbench-shell__dock-handle" type="button" aria-label="Resize dock" @pointerdown="startDockResize" />
        <div v-if="dockVisible && $slots.dock" class="workbench-shell__dock" @focusin.capture="workspaceState.activePanelRegion = 'main'" @pointerdown.capture="workspaceState.activePanelRegion = 'main'">
          <slot name="dock"/>
        </div>
      </section>
      <ActivityBarRight/>
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
import {setBottomPanelHeight, setRightPanelWidth, setSidebarWidth, workspaceState} from '../entities/workspace'
import ActivityBarLeft from './activity-bar-left/ActivityBarLeft.vue'
import ActivityBarRight from './activity-bar-right/ActivityBarRight.vue'
import CommandPaletteHost from './overlays/CommandPaletteHost.vue'
import ContextMenuHost from './overlays/ContextMenuHost.vue'
import DialogHost from './overlays/DialogHost.vue'
import HostKeyDialogHost from './overlays/HostKeyDialogHost.vue'
import QuickOpenHost from './overlays/QuickOpenHost.vue'
import SettingsDialogHost from './overlays/SettingsDialogHost.vue'
import ToastHost from './overlays/ToastHost.vue'
import SidebarLeft from './sidebar-left/SidebarLeft.vue'
import SidebarRight from './sidebar-right/SidebarRight.vue'
import StatusBar from './status-bar/StatusBar.vue'
import AppTitlebar from './titlebar/AppTitlebar.vue'

defineProps<{dockVisible?: boolean}>()

const sidebarLeftRef = ref<HTMLElement | null>(null)
const sidebarRightRef = ref<HTMLElement | null>(null)

const sidebarLeftStyle = computed(() => ({width: `${workspaceState.sidebarWidth}px`}))
const sidebarRightStyle = computed(() => ({width: `${workspaceState.rightPanelWidth}px`}))

const bodyClasses = computed(() => ({
  'workbench-shell__workspace--no-sidebar-left': !workspaceState.sidebarVisible,
  'workbench-shell__workspace--no-sidebar-right': !workspaceState.rightPanelVisible,
}))

onMounted(() => window.addEventListener('keydown', closeSidebarWithEscape))
onUnmounted(() => window.removeEventListener('keydown', closeSidebarWithEscape))

function startSidebarLeftResize(event: PointerEvent) {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = workspaceState.sidebarWidth
  document.body.classList.add('is-resizing')
  let nextWidth = startWidth

  function move(pointerEvent: PointerEvent) {
    nextWidth = clampSidebarWidth(startWidth + pointerEvent.clientX - startX)
    if (sidebarLeftRef.value) sidebarLeftRef.value.style.width = `${nextWidth}px`
    document.body.style.setProperty('--resize-guide-x', `${pointerEvent.clientX}px`)
  }

  function end(pointerEvent: PointerEvent) {
    move(pointerEvent)
    setSidebarWidth(nextWidth)
    if (sidebarLeftRef.value) sidebarLeftRef.value.style.removeProperty('width')
    document.body.classList.remove('is-resizing')
    document.body.style.removeProperty('--resize-guide-x')
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

function startSidebarRightResize(event: PointerEvent) {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = workspaceState.rightPanelWidth
  document.body.classList.add('is-resizing')
  let nextWidth = startWidth

  function move(pointerEvent: PointerEvent) {
    nextWidth = clampSidebarWidth(startWidth - (pointerEvent.clientX - startX))
    if (sidebarRightRef.value) sidebarRightRef.value.style.width = `${nextWidth}px`
    document.body.style.setProperty('--resize-guide-x', `${pointerEvent.clientX}px`)
  }

  function end(pointerEvent: PointerEvent) {
    move(pointerEvent)
    setRightPanelWidth(nextWidth)
    if (sidebarRightRef.value) sidebarRightRef.value.style.removeProperty('width')
    document.body.classList.remove('is-resizing')
    document.body.style.removeProperty('--resize-guide-x')
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

function startDockResize(event: PointerEvent) {
  event.preventDefault()
  const startY = event.clientY
  const startHeight = workspaceState.bottomPanelHeight
  document.body.classList.add('is-resizing-dock')

  function move(pointerEvent: PointerEvent) {
    setBottomPanelHeight(startHeight - (pointerEvent.clientY - startY))
    document.body.style.setProperty('--resize-guide-y', `${pointerEvent.clientY}px`)
  }

  function end(pointerEvent: PointerEvent) {
    move(pointerEvent)
    document.body.classList.remove('is-resizing-dock')
    document.body.style.removeProperty('--resize-guide-y')
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
  if (event.key === 'Escape' && window.matchMedia('(max-width: 900px)').matches) {
    workspaceState.sidebarVisible = false
    workspaceState.rightPanelVisible = false
  }
}
</script>
