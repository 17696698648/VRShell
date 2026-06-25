<template>
  <aside class="sidebar-right" :style="{width: `${width}px`}">
    <button class="workbench-shell__sidebar-right-handle" type="button" aria-label="Resize sidebar" @pointerdown="emit('resize-start', $event)" />
    <slot>
      <SidebarRightPanelHost/>
    </slot>
  </aside>
</template>

<script setup lang="ts">
import SidebarRightPanelHost from './SidebarRightPanelHost.vue'

defineProps<{
  width: number
}>()

const emit = defineEmits<{
  'resize-start': [event: PointerEvent]
}>()
</script>
