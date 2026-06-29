<template>
  <section v-if="activeDockPanel" class="terminal-panel dock-host dock-host--bottom" :style="dockStyle">
    <div class="terminal-console dock-host__content">
      <component :is="activeDockPanel.component" class="dock-host__panel" />
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {workspaceState} from '../../entities/workspace'
import {useBottomDockPanel} from '../../features/workspace/dock-registry'

const activeDockPanel = useBottomDockPanel()
const dockStyle = computed(() => ({
  '--dock-bottom-height': `${workspaceState.bottomPanelHeight}px`,
}))
</script>
