<template>
  <UiToolbar class="sftp-toolbar" label="SFTP actions" :aria-busy="loading || undefined">
    <template #trailing>
      <UiToolbarButtonGroup :items="viewModeItems" label="SFTP view mode" :model-value="viewMode" @update:model-value="$emit('update:viewMode', $event as SftpViewMode)" />
      <UiIconButton :icon="FolderPlus" label="Create remote directory" :disabled="disabled || loading" @click="$emit('mkdir')" />
      <UiIconButton :icon="Upload" label="Upload file to current directory" :disabled="disabled || loading" @click="$emit('upload')" />
      <UiIconButton :icon="ArrowUp" label="Open parent directory" :disabled="disabled || loading" @click="$emit('up')" />
      <UiIconButton :icon="RefreshCw" label="Refresh current directory" :disabled="disabled || loading" variant="secondary" @click="$emit('refresh')" />
    </template>
  </UiToolbar>
</template>

<script setup lang="ts">
import {Columns3, FolderTree, List, ArrowUp, FolderPlus, RefreshCw, Upload} from '@lucide/vue'
import {UiIconButton, UiToolbar, UiToolbarButtonGroup, type UiToolbarButtonGroupItem} from '../../../shared/ui'
import type {SftpViewMode} from '../model/sftpViewMode'

defineProps<{disabled?: boolean; loading?: boolean; viewMode: SftpViewMode}>()
defineEmits<{mkdir: []; refresh: []; up: []; upload: []; 'update:viewMode': [mode: SftpViewMode]}>()

const viewModeItems: UiToolbarButtonGroupItem[] = [
  {id: 'tree', icon: FolderTree, label: 'Tree', tooltip: 'Show directories as a tree'},
  {id: 'list', icon: List, label: 'List', tooltip: 'Show files in a detailed list'},
  {id: 'split', icon: Columns3, label: 'Split', tooltip: 'Show directory and detail panes'},
]
</script>
