<template>
  <header class="titlebar" data-tauri-drag-region @pointerdown="startWindowDrag">
    <div class="titlebar__brand">
      <img class="titlebar__logo" src="/app-icon.png" alt="VRShell" />
    </div>
    <WorkspaceContext />
    <WindowControls />
  </header>
</template>

<script setup lang="ts">
import {getCurrentWindow} from '@tauri-apps/api/window'
import WindowControls from './WindowControls.vue'
import WorkspaceContext from './WorkspaceContext.vue'

const appWindow = getCurrentWindow()

async function startWindowDrag(event: PointerEvent) {
  if (event.button !== 0) return
  if ((event.target as HTMLElement | null)?.closest('button, input, textarea, select, a')) return
  await appWindow.startDragging()
}
</script>
