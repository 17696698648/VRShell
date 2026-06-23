<template>
  <aside class="sidebar" :style="{width: `${width}px`}">
    <slot>
      <SidebarPanelHost/>
    </slot>
    <button class="workbench-shell__sidebar-handle" type="button" aria-label="Resize sidebar" @pointerdown="emit('resize-start', $event)" />
  </aside>
</template>

<script setup lang="ts">
import SidebarPanelHost from './SidebarPanelHost.vue'

defineProps<{
  width: number
}>()

const emit = defineEmits<{
  'resize-start': [event: PointerEvent]
}>()
</script>
