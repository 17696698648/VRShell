<template>
  <div class="titlebar-window-controls">
    <button title="Minimize" @click="emit('minimize')">
      <Minus :size="14"/>
    </button>
    <button :title="isWindowMaximized ? 'Restore' : 'Maximize'" @click="emit('toggle-maximize')">
      <Square v-if="!isWindowMaximized" :size="12"/>
      <Copy v-else :size="12"/>
    </button>
    <button class="close" title="Close" @click="emit('close')">
      <X :size="14"/>
    </button>
  </div>
</template>

<script setup lang="ts">
import {Copy, Minus, Square, X} from '@lucide/vue'

defineProps<{
  isWindowMaximized: boolean
}>()

const emit = defineEmits<{
  (event: 'minimize'): void
  (event: 'toggle-maximize'): void
  (event: 'close'): void
}>()
</script>

<style scoped>
.titlebar-window-controls {
  display: flex;
  align-items: stretch;
  height: 100%;
}

.titlebar-window-controls button {
  display: grid;
  width: 46px;
  height: 100%;
  place-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  color: #d1d5db;
  line-height: 1;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.titlebar-window-controls button:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.titlebar-window-controls button.close:hover {
  background: #c42b1c;
  color: #fff;
}
</style>
