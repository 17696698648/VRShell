<template>
  <section :class="classes">
    <div class="workbench-layout__primary">
      <slot name="primary"/>
    </div>
    <div v-if="$slots.secondary" class="workbench-layout__secondary">
      <slot name="secondary"/>
    </div>
    <aside v-if="$slots.dock" class="workbench-layout__dock" :data-placement="dockPlacement">
      <slot name="dock"/>
    </aside>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {MainAreaMode, PanelPlacement, WorkspaceLayoutPreset} from '../../../entities/workspace'

const props = withDefaults(
  defineProps<{
    mode?: MainAreaMode
    preset?: WorkspaceLayoutPreset
    dockPlacement?: PanelPlacement
  }>(),
  {
    dockPlacement: 'bottom',
    mode: 'horizontal-split',
    preset: 'operations',
  },
)

const classes = computed(() => [
  'workbench-layout',
  `workbench-layout--${props.mode}`,
  `workbench-layout--preset-${props.preset}`,
  `workbench-layout--dock-${props.dockPlacement}`,
])
</script>
