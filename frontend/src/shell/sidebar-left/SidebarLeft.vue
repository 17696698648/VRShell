<template>
  <aside class="sidebar-left" :style="{width: `${width}px`}">
    <slot>
      <SidebarLeftPanelHost/>
    </slot>
    <button class="workbench-shell__sidebar-left-handle" type="button" aria-label="Resize sidebar" @pointerdown="emit('resize-start', $event)" />
  </aside>
</template>

<script setup lang="ts">
import SidebarLeftPanelHost from './SidebarLeftPanelHost.vue'

defineProps<{
  width: number
}>()

const emit = defineEmits<{
  'resize-start': [event: PointerEvent]
}>()
</script>
