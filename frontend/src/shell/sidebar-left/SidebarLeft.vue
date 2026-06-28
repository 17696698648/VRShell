<template>
  <aside class="sidebar-left" :style="{width: `${width}px`}">
    <slot>
      <SidebarLeftPanelHost/>
    </slot>
  </aside>
</template>

<script setup lang="ts">
import SidebarLeftPanelHost from './SidebarLeftPanelHost.vue'

defineProps<{
  width: number
}>()

</script>
