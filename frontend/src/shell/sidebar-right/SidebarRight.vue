<template>
  <aside class="sidebar-right" :style="{width: `${width}px`}">
    <div class="sidebar-right__content">
      <slot>
        <SidebarRightPanelHost/>
      </slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import SidebarRightPanelHost from './SidebarRightPanelHost.vue'

defineProps<{
  width: number
}>()

</script>
