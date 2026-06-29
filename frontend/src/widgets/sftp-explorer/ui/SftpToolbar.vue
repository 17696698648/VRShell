<template>
  <UiToolbar class="sftp-toolbar" :label="messages.sftp.toolbar.actions" :aria-busy="loading || undefined">
    <template #trailing>
      <UiToolbarButtonGroup :items="viewModeItems" :label="messages.sftp.toolbar.viewMode" :model-value="viewMode" @update:model-value="$emit('update:viewMode', $event as SftpViewMode)" />
      <UiIconButton :icon="FolderPlus" :label="messages.sftp.toolbar.createDirectory" :disabled="disabled || loading" @click="$emit('mkdir')" />
      <UiIconButton :icon="Upload" :label="messages.sftp.toolbar.uploadFile" :disabled="disabled || loading" @click="$emit('upload')" />
      <UiIconButton :icon="RefreshCw" :label="messages.sftp.toolbar.refreshCurrent" :disabled="disabled || loading" variant="secondary" @click="$emit('refresh')" />
    </template>
  </UiToolbar>
</template>

<script setup lang="ts">
import {FolderPlus, FolderTree, List, RefreshCw, Upload} from '@lucide/vue'
import {messages} from '../../../shared/copy'
import {UiIconButton, UiToolbar, UiToolbarButtonGroup, type UiToolbarButtonGroupItem} from '../../../shared/ui'
import type {SftpViewMode} from '../model/sftpViewMode'

defineProps<{disabled?: boolean; loading?: boolean; viewMode: SftpViewMode}>()
defineEmits<{mkdir: []; refresh: []; upload: []; 'update:viewMode': [mode: SftpViewMode]}>()

const viewModeItems: UiToolbarButtonGroupItem[] = [
  {id: 'tree', icon: FolderTree, label: messages.sftp.toolbar.tree, tooltip: messages.sftp.toolbar.treeTooltip},
  {id: 'list', icon: List, label: messages.sftp.toolbar.list, tooltip: messages.sftp.toolbar.listTooltip},
]
</script>
