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
      <span>Dock {{ workspaceState.panelPlacement }} · {{ workspaceState.activeBottomDockPanel }}</span>
      <span>Split {{ workspaceState.mainSplitRatio }}% · {{ workspaceState.mainAreaMode }}</span>
    </div>
    <div class="layout-actions">
      <UiActionButton command-id="workspace.resetLayout" label="Reset Layout" variant="secondary" />
      <UiActionButton command-id="workspace.toggleMaximizePanel" label="Maximize" />
      <UiActionButton command-id="workspace.moveDockBottom" label="Dock Bottom" />
    </div>
    <div class="settings-field"><UiSelect :model-value="workspaceState.compactMode ? 'on' : 'auto'" label="Compact mode" description="Compact mode hides secondary panes to keep terminal space usable." :options="compactModeOptions" @update:model-value="onCompactChange" /></div>
    <div class="settings-field"><UiSelect model-value="restore-last" label="Dock restore" disabled description="Restore policy will be persisted with workspace layout." :options="dockRestoreOptions" /></div>
  </section>
</template>
<script setup lang="ts">
import {applyLayoutPreset, setCompactMode, workspaceState, type WorkspaceLayoutPreset} from '../../../entities/workspace'
import {UiActionButton, UiSelect, type UiSelectOption} from '../../../shared/ui'

const presets: Array<{id: WorkspaceLayoutPreset; title: string; description: string}> = [
  {id: 'operations', title: 'Operations', description: 'Terminal first with diagnostics dock.'},
  {id: 'development', title: 'Development', description: 'Terminal and editor split for code work.'},
  {id: 'file-transfer', title: 'File transfer', description: 'SFTP and task progress focused.'},
  {id: 'monitoring', title: 'Monitoring', description: 'Logs, output, and problems visible.'},
]
const compactModeOptions: UiSelectOption[] = [
  {label: 'Auto by window width', value: 'auto'},
  {label: 'Force compact', value: 'on'},
  {label: 'Force full layout', value: 'off'},
]
const dockRestoreOptions: UiSelectOption[] = [
  {label: 'Restore last open dock panels', value: 'restore-last'},
  {label: 'Open Problems when errors exist', value: 'open-problems'},
]

function onCompactChange(value: string) {
  if (value !== 'auto') setCompactMode(value === 'on')
}
</script>
