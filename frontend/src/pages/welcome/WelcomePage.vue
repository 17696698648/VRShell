<template>
  <section class="welcome-page">
    <EmptyState
      icon="⌁"
      title="Welcome to VRShell"
      description="A compact IDE-style workspace for SSH, terminal, SFTP, and long-running remote tasks."
    >
      <template #actions>
        <UiButton variant="primary" @click="executeCommand('session.createQuick')">New SSH Session</UiButton>
        <UiButton variant="secondary" @click="executeCommand('session.importSshConfig')">Import SSH Config</UiButton>
        <UiButton variant="ghost" @click="executeCommand('workspace.openCommandPalette')">Open Command Palette</UiButton>
      </template>
      <template #secondary>
        <span>Tip: press <kbd>Ctrl+P</kbd> to search commands and sessions.</span>
      </template>
    </EmptyState>
  </section>
</template>

<script setup lang="ts">
import {executeCommand} from '../../features/workspace/command-registry'
import {EmptyState, UiButton} from '../../shared/ui'
</script>
