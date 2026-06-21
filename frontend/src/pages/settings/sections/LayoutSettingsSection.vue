<template>
  <section class="settings-section">
    <div><h3>Layout</h3><p>Control workbench presets, dock restore behavior, and compact mode.</p></div>
    <label class="settings-field"><span>Layout preset</span><select :value="workspaceState.layoutPreset" @change="onPresetChange"><option value="operations">Operations</option><option value="development">Development</option><option value="file-transfer">File transfer</option><option value="monitoring">Monitoring</option></select></label>
    <label class="settings-field"><span>Compact mode</span><select :value="workspaceState.compactMode ? 'on' : 'auto'" @change="onCompactChange"><option value="auto">Auto by window width</option><option value="on">Force compact</option><option value="off">Force full layout</option></select><small>Compact mode hides secondary panes to keep terminal space usable.</small></label>
    <label class="settings-field"><span>Dock restore</span><select disabled><option>Restore last open dock panels</option><option>Open Problems when errors exist</option></select><small>Restore policy will be persisted with workspace layout.</small></label>
  </section>
</template>
<script setup lang="ts">
import {setCompactMode, setLayoutPreset, workspaceState, type WorkspaceLayoutPreset} from '../../../entities/workspace'
function onPresetChange(event: Event) { setLayoutPreset((event.target as HTMLSelectElement).value as WorkspaceLayoutPreset) }
function onCompactChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value !== 'auto') setCompactMode(value === 'on')
}
</script>
