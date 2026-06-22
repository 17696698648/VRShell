<template>
  <UiToolbar label="Session actions">
    <template #leading>
      <div class="ui-toolbar__title">
      <strong>Sessions</strong>
      <small>SSH inventory</small>
      </div>
    </template>
    <template #trailing>
      <UiTooltip text="Create session group">
        <UiButton size="sm" variant="ghost" @click="$emit('createGroup')"><FolderPlus :size="14" /> Group</UiButton>
      </UiTooltip>
      <UiActionButton command-id="session.importSshConfig" :icon="Download" label="Import" tooltip="Import SSH config" />
      <UiTooltip :text="formOpen ? 'Close new session form' : 'Create new session'" shortcut="Ctrl+N">
        <UiButton size="sm" :variant="formOpen ? 'secondary' : 'primary'" @click="$emit('create')"><component :is="formOpen ? X : Plus" :size="14" /> {{ formOpen ? 'Close' : 'New' }}</UiButton>
      </UiTooltip>
    </template>
  </UiToolbar>
</template>

<script setup lang="ts">
import {Download, FolderPlus, Plus, X} from '@lucide/vue'
import {UiActionButton, UiButton, UiToolbar, UiTooltip} from '../../../shared/ui'

defineProps<{formOpen: boolean}>()
defineEmits<{create: []; createGroup: []; importSshConfig: []}>()
</script>
