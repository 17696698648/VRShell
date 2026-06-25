<template>
  <section class="settings-section">
    <div><h3>Layout</h3><p>Control workbench presets, dock restore behavior, and compact mode.</p></div>
    <div class="layout-preset-grid" aria-label="Layout presets">
      <button v-for="preset in presets" :key="preset.id" type="button" :class="['layout-preset-card', {active: workspaceState.layoutPreset === preset.id}]" @click="applyLayoutPreset(preset.id)">
        <span class="layout-preset-card__preview" :data-preset="preset.id"><i /><i /><i /></span>
        <strong>{{ preset.title }}</strong>
        <small>{{ preset.description }}</small>
      </button>
    </div>
    <div class="layout-inspector">
      <strong>Current layout</strong>
      <span>Sidebar {{ workspaceState.sidebarWidth }}px</span>
      <span>Dock {{ workspaceState.panelPlacement }} · B:{{ workspaceState.activeBottomDockPanel }} R:{{ workspaceState.activeRightDockPanel }}</span>
      <span>Split {{ workspaceState.mainSplitRatio }}% · {{ workspaceState.mainAreaMode }}</span>
    </div>
    <div class="layout-actions">
      <UiActionButton command-id="workspace.resetLayout" label="Reset Layout" variant="secondary" />
      <UiActionButton command-id="workspace.toggleMaximizePanel" label="Maximize" />
      <UiActionButton command-id="workspace.moveDockBottom" label="Dock Bottom" />
      <UiActionButton command-id="workspace.moveDockRight" label="Dock Right" />
    </div>
    <label class="settings-field"><span>Compact mode</span><select :value="workspaceState.compactMode ? 'on' : 'auto'" @change="onCompactChange"><option value="auto">Auto by window width</option><option value="on">Force compact</option><option value="off">Force full layout</option></select><small>Compact mode hides secondary panes to keep terminal space usable.</small></label>
    <label class="settings-field"><span>Dock restore</span><select disabled><option>Restore last open dock panels</option><option>Open Problems when errors exist</option></select><small>Restore policy will be persisted with workspace layout.</small></label>
  </section>
</template>
<script setup lang="ts">
import {applyLayoutPreset, setCompactMode, workspaceState, type WorkspaceLayoutPreset} from '../../../entities/workspace'
import {UiActionButton} from '../../../shared/ui'

const presets: Array<{id: WorkspaceLayoutPreset; title: string; description: string}> = [
  {id: 'operations', title: 'Operations', description: 'Terminal first with diagnostics dock.'},
  {id: 'development', title: 'Development', description: 'Terminal and editor split for code work.'},
  {id: 'file-transfer', title: 'File transfer', description: 'SFTP and task progress focused.'},
  {id: 'monitoring', title: 'Monitoring', description: 'Logs, output, and problems visible.'},
]

function onCompactChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value !== 'auto') setCompactMode(value === 'on')
}
</script>
