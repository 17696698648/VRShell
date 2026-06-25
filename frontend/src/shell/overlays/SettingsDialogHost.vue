<template>
  <Transition name="overlay-fade">
    <div v-if="workspaceState.settingsDialogOpen" class="settings-dialog-backdrop" @click.self="closeSettings">
    <section class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
      <header class="settings-dialog__header">
        <div>
          <h2 id="settings-dialog-title">Settings</h2>
          <p>Configure VRShell preferences, layout, terminal, SFTP, and security.</p>
        </div>
        <button type="button" aria-label="Close settings" title="Close" @click="closeSettings"><X :size="16" /></button>
      </header>
      <SettingsPage embedded />
    </section>
  </div>
  </Transition>
</template>

<script setup lang="ts">
import {X} from '@lucide/vue'
import {onMounted, onUnmounted} from 'vue'
import {workspaceState} from '../../entities/workspace'
import SettingsPage from '../../pages/settings/SettingsPage.vue'

onMounted(() => window.addEventListener('keydown', closeWithEscape))
onUnmounted(() => window.removeEventListener('keydown', closeWithEscape))

function closeSettings() {
  workspaceState.settingsDialogOpen = false
}

function closeWithEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && workspaceState.settingsDialogOpen) closeSettings()
}
</script>
