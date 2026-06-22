<template>
  <UiToolbar class="sftp-toolbar" label="SFTP actions" :aria-busy="loading || undefined">
    <template #trailing>
      <UiToolbarButtonGroup :items="viewModeItems" label="SFTP view mode" :model-value="viewMode" @update:model-value="$emit('update:viewMode', $event as SftpViewMode)" />
      <UiTooltip text="Create remote directory">
        <UiButton size="sm" variant="ghost" :disabled="loading" @click="$emit('mkdir')"><FolderPlus :size="14" /> Folder</UiButton>
      </UiTooltip>
      <UiTooltip text="Upload file to current directory">
        <UiButton size="sm" variant="ghost" :disabled="loading" @click="$emit('upload')"><Upload :size="14" /> Upload</UiButton>
      </UiTooltip>
      <UiTooltip text="Open parent directory" shortcut="Alt+Up">
        <UiButton size="sm" variant="ghost" :disabled="loading" @click="$emit('up')"><ArrowUp :size="14" /> Up</UiButton>
      </UiTooltip>
      <UiTooltip text="Refresh current directory" shortcut="Ctrl+R">
        <UiButton size="sm" variant="secondary" :disabled="loading" :loading="loading" @click="$emit('refresh')"><RefreshCw :size="14" /> Refresh</UiButton>
      </UiTooltip>
    </template>
  </UiToolbar>
</template>

<script setup lang="ts">
import {Columns3, FolderTree, List, ArrowUp, FolderPlus, RefreshCw, Upload} from '@lucide/vue'
import {UiButton, UiToolbar, UiToolbarButtonGroup, UiTooltip, type UiToolbarButtonGroupItem} from '../../../shared/ui'
import type {SftpViewMode} from '../model/sftpViewMode'

defineProps<{loading?: boolean; viewMode: SftpViewMode}>()
defineEmits<{mkdir: []; refresh: []; up: []; upload: []; 'update:viewMode': [mode: SftpViewMode]}>()

const viewModeItems: UiToolbarButtonGroupItem[] = [
  {id: 'tree', icon: FolderTree, label: 'Tree', tooltip: 'Show directories as a tree'},
  {id: 'list', icon: List, label: 'List', tooltip: 'Show files in a detailed list'},
  {id: 'split', icon: Columns3, label: 'Split', tooltip: 'Show directory and detail panes'},
]
</script>
