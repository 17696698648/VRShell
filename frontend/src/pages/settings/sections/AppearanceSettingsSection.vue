<template>
  <section class="settings-section">
    <div><h3>Appearance</h3><p>Theme and density apply immediately.</p></div>
    <label class="settings-field"><span>Theme</span><select :value="workspaceState.theme" @change="onThemeChange"><option value="dark">Dark</option><option value="light">Light</option><option value="high-contrast">High contrast</option></select></label>
    <label class="settings-field"><span>Density</span><select :value="workspaceState.density" @change="onDensityChange"><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="dense">Dense</option></select><small>Density is independent from theme.</small></label>
  </section>
</template>
<script setup lang="ts">
import {workspaceState, type WorkspaceDensity, type WorkspaceTheme} from '../../../entities/workspace'
import {switchDensity} from '../../../features/settings/switch-density/switchDensity'
import {switchTheme} from '../../../features/settings/switch-theme/switchTheme'
function onThemeChange(event: Event) { switchTheme((event.target as HTMLSelectElement).value as WorkspaceTheme) }
function onDensityChange(event: Event) { switchDensity((event.target as HTMLSelectElement).value as WorkspaceDensity) }
</script>
