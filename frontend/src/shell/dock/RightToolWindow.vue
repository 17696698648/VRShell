<template>
  <aside v-if="activeDockPanel" class="right-tool-window" :style="toolWindowStyle">
    <component :is="activeDockPanel.component" />
  </aside>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {workspaceState} from '../../entities/workspace'
import {useActiveDockPanel} from '../../features/workspace/dock-registry'

const activeDockPanel = useActiveDockPanel()
const toolWindowStyle = computed(() => ({width: `${workspaceState.rightDockWidth}px`}))
</script>
