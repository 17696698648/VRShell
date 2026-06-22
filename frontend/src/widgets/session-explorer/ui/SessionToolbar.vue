<template>
  <UiToolbar label="Session actions">
    <template #trailing>
      <UiIconButton :icon="FolderPlus" label="Create session group" @click="$emit('createGroup')" />
      <UiIconButton :icon="Download" label="Import SSH config" @click="executeCommand('session.importSshConfig')" />
      <UiIconButton :icon="formOpen ? X : Plus" :label="formOpen ? 'Close new session form' : 'Create new session'" @click="$emit('create')" />
    </template>
  </UiToolbar>
</template>

<script setup lang="ts">
import {Download, FolderPlus, Plus, X} from '@lucide/vue'
import {executeCommand} from '../../../shared/command'
import {UiIconButton, UiToolbar} from '../../../shared/ui'

defineProps<{formOpen: boolean}>()
defineEmits<{create: []; createGroup: []}>()
</script>
