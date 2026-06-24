<template>
  <div class="window-controls" aria-label="Window controls">
    <button type="button" aria-label="Minimize window" title="Minimize" @click="minimizeWindow">
      <Minus :size="12" aria-hidden="true" />
    </button>
    <button type="button" :aria-label="maximized ? 'Restore window' : 'Maximize window'" :title="maximized ? 'Restore' : 'Maximize'" @click="toggleMaximizeWindow">
      <Copy v-if="maximized" :size="11" aria-hidden="true" />
      <Square v-else :size="10" aria-hidden="true" />
    </button>
    <button class="window-controls__close" type="button" aria-label="Close window" title="Close" @click="closeWindow">
      <X :size="13" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import {getCurrentWindow} from '@tauri-apps/api/window'
import {Copy, Minus, Square, X} from '@lucide/vue'
import {onMounted, ref} from 'vue'

const appWindow = getCurrentWindow()
const maximized = ref(false)

onMounted(async () => {
  maximized.value = await appWindow.isMaximized()
})

async function minimizeWindow() {
  await appWindow.minimize()
}

async function toggleMaximizeWindow() {
  await appWindow.toggleMaximize()
  maximized.value = await appWindow.isMaximized()
}

async function closeWindow() {
  await appWindow.close()
}
</script>
