<template>
  <EmptyState icon="SSH" title="No terminal" description="Connect a session to open a terminal tab, or use the command palette to find a session quickly.">
    <template #actions>
      <UiButton variant="primary" @click="executeCommand('workspace.openSessionsPanel')">Open Sessions</UiButton>
      <UiButton variant="ghost" @click="executeCommand('workspace.openCommandPalette')">Command Palette</UiButton>
    </template>
  </EmptyState>
</template>

<script setup lang="ts">
import {executeCommand} from '../../../features/workspace/command-registry'
import {EmptyState, UiButton} from '../../../shared/ui'
</script>
