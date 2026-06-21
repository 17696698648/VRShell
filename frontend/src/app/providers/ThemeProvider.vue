<template><slot /></template>

<script setup lang="ts">
import {watch} from 'vue'
import {workspaceState} from '../../entities/workspace'
import {setTheme} from '../../shared/theme/themeService'

watch(
  () => workspaceState.theme,
  (theme) => setTheme(theme),
  {immediate: true},
)

watch(
  () => workspaceState.density,
  (density) => {
    document.documentElement.dataset.density = density
  },
  {immediate: true},
)
</script>
