<template>
  <section class="settings-section">
    <div><h3>Appearance</h3><p>Theme and density apply immediately.</p></div>
    <div class="settings-field"><UiSelect :model-value="workspaceState.theme" label="Theme" :options="themeOptions" @update:model-value="onThemeChange" /></div>
    <div class="settings-field"><UiSelect :model-value="workspaceState.density" label="Density" description="Density is independent from theme." :options="densityOptions" @update:model-value="onDensityChange" /></div>
  </section>
</template>
<script setup lang="ts">
import {workspaceState, type WorkspaceDensity, type WorkspaceTheme} from '../../../entities/workspace'
import {switchDensity} from '../../../features/settings/switch-density/switchDensity'
import {switchTheme} from '../../../features/settings/switch-theme/switchTheme'
import {UiSelect, type UiSelectOption} from '../../../shared/ui'

const themeOptions: UiSelectOption[] = [
  {label: 'Dark', value: 'dark'},
  {label: 'Light', value: 'light'},
  {label: 'High contrast', value: 'high-contrast'},
]
const densityOptions: UiSelectOption[] = [
  {label: 'Compact', value: 'compact'},
  {label: 'Comfortable', value: 'comfortable'},
  {label: 'Dense', value: 'dense'},
]

function onThemeChange(value: string) { switchTheme(value as WorkspaceTheme) }
function onDensityChange(value: string) { switchDensity(value as WorkspaceDensity) }
</script>
