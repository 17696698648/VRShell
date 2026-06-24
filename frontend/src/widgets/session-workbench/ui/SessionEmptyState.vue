<template>
  <EmptyState icon="SSH" title="No terminal" description="Use the plus button to open a terminal for the current session, or choose another session from the sidebar.">
    <template #actions>
      <UiButton variant="primary" @click="executeCommand('workspace.openSessionsPanel')">Open Sessions</UiButton>
      <UiButton variant="ghost" @click="executeCommand('workspace.openCommandPalette')">Command Palette</UiButton>
    </template>
  </EmptyState>
</template>

<script setup lang="ts">
import {executeCommand} from '../../../shared/command'
import {EmptyState, UiButton} from '../../../shared/ui'
</script>
