<template>
  <aside class="sidebar" :style="{width: `${width}px`}">
    <slot>
      <SidebarPanelHost/>
    </slot>
  </aside>
</template>

<script setup lang="ts">
import SidebarPanelHost from './SidebarPanelHost.vue'

defineProps<{
  width: number
}>()
</script>
