<template>
  <aside class="sidebar-right" :style="width ? {width: `${width}px`} : undefined">
    <div class="sidebar-right__content">
      <slot>
        <SidebarRightPanelHost/>
      </slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import SidebarRightPanelHost from './SidebarRightPanelHost.vue'

defineProps<{width?: number}>()

</script>
