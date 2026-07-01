<template>
  <UiToolbar class="sftp-toolbar" :label="messages.sftp.toolbar.actions" :aria-busy="loading || undefined">
    <template #trailing>
      <UiToolbarButtonGroup :items="viewModeItems" :label="messages.sftp.toolbar.viewMode" :model-value="viewMode" @update:model-value="$emit('update:viewMode', $event as SftpViewMode)" />
      <UiIconButton :icon="FolderPlus" label="New remote item" :disabled="disabled || loading" @click="openCreateMenu" />
      <UiIconButton :icon="Upload" label="Upload to current directory" :disabled="disabled || loading" @click="openUploadMenu" />
      <UiIconButton :icon="RefreshCw" :label="messages.sftp.toolbar.refreshCurrent" :disabled="disabled || loading" variant="secondary" @click="$emit('refresh')" />
    </template>
  </UiToolbar>
</template>

<script setup lang="ts">
import {FolderPlus, FolderTree, List, RefreshCw, Upload} from '@lucide/vue'
import {openContextMenu} from '../../../shared/context-menu'
import {messages} from '../../../shared/copy'
import {UiIconButton, UiToolbar, UiToolbarButtonGroup, type UiToolbarButtonGroupItem} from '../../../shared/ui'
import type {SftpViewMode} from '../model/sftpViewMode'

defineProps<{disabled?: boolean; loading?: boolean; viewMode: SftpViewMode}>()
type SftpUploadConflictStrategy = 'overwrite' | 'skip' | 'rename'

const emit = defineEmits<{mkdir: []; newFile: []; refresh: []; upload: [conflict: SftpUploadConflictStrategy]; uploadFolder: []; 'update:viewMode': [mode: SftpViewMode]}>()

const viewModeItems: UiToolbarButtonGroupItem[] = [
  {id: 'tree', icon: FolderTree, label: messages.sftp.toolbar.tree, tooltip: messages.sftp.toolbar.treeTooltip},
  {id: 'list', icon: List, label: messages.sftp.toolbar.list, tooltip: messages.sftp.toolbar.listTooltip},
]

function openCreateMenu(event: MouseEvent) {
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'new-folder', label: messages.sftp.contextMenu.newFolder, run: () => emit('mkdir')},
      {id: 'new-file', label: messages.sftp.contextMenu.newFile, run: () => emit('newFile')},
    ],
  })
}

function openUploadMenu(event: MouseEvent) {
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'upload-file-overwrite', label: `${messages.sftp.contextMenu.uploadFile} · overwrite`, run: () => emit('upload', 'overwrite')},
      {id: 'upload-file-skip', label: `${messages.sftp.contextMenu.uploadFile} · skip existing`, run: () => emit('upload', 'skip')},
      {id: 'upload-file-rename', label: `${messages.sftp.contextMenu.uploadFile} · auto rename`, run: () => emit('upload', 'rename')},
      {id: 'upload-folder', label: messages.sftp.contextMenu.uploadFolder, run: () => emit('uploadFolder')},
    ],
  })
}
</script>
