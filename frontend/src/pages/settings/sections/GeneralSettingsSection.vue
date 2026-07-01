<template>
  <section class="settings-section general-settings-section">
    <div>
      <h3>General</h3>
      <p>Application defaults, workspace recovery, and first-run entry points.</p>
    </div>

    <div class="settings-field general-settings-section__summary">
      <span>Workspace summary</span>
      <div class="general-settings-section__metrics">
        <strong>{{ sessionCount }}</strong>
        <small>Sessions</small>
        <strong>{{ terminalCount }}</strong>
        <small>Terminal tabs</small>
        <strong>{{ workspaceState.theme }}</strong>
        <small>Theme</small>
      </div>
    </div>

    <div class="settings-field">
      <UiSelect model-value="welcome" label="Startup view" disabled description="VRShell opens the welcome page until a terminal session is active." :options="startupOptions" />
    </div>

    <div class="settings-field general-settings-section__actions">
      <span>Quick actions</span>
      <div>
        <UiActionButton command-id="session.createQuick" label="New SSH Session" variant="primary" />
        <UiActionButton command-id="session.importSshConfig" label="Import SSH Config" variant="secondary" />
        <UiActionButton command-id="workspace.resetLayout" label="Reset Layout" variant="secondary" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {sessionState} from '../../../entities/session'
import {terminalState} from '../../../entities/terminal'
import {workspaceState} from '../../../entities/workspace'
import {UiActionButton, UiSelect, type UiSelectOption} from '../../../shared/ui'

const sessionCount = computed(() => sessionState.sessions.length)
const terminalCount = computed(() => terminalState.tabs.length)
const startupOptions: UiSelectOption[] = [
  {label: 'Welcome page when no terminal is open', value: 'welcome'},
  {label: 'Restore last workspace', value: 'restore'},
]
</script>
