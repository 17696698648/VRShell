<template>
  <UiToolbar class="sftp-toolbar" label="SFTP actions" :aria-busy="loading || undefined">
    <template #leading>
      <div class="ui-toolbar__title">
      <strong>SFTP</strong>
      <small>{{ loading ? 'Loading remote directory...' : 'Remote files' }}</small>
      </div>
    </template>
    <template #trailing>
      <div class="sftp-view-switcher" aria-label="SFTP view mode">
        <button
          v-for="mode in viewModes"
          :key="mode"
          :class="{active: viewMode === mode}"
          type="button"
          :title="`Switch to ${mode} view`"
          @click="$emit('update:viewMode', mode)"
        >
          {{ mode }}
        </button>
      </div>
      <UiTooltip text="Create remote directory">
        <UiButton size="sm" variant="ghost" :disabled="loading" @click="$emit('mkdir')"><FolderPlus :size="14" /> Folder</UiButton>
      </UiTooltip>
      <UiTooltip text="Upload file to current directory">
        <UiButton size="sm" variant="ghost" :disabled="loading" @click="$emit('upload')"><Upload :size="14" /> Upload</UiButton>
      </UiTooltip>
      <UiTooltip text="Open parent directory" shortcut="Alt+↑">
        <UiButton size="sm" variant="ghost" :disabled="loading" @click="$emit('up')"><ArrowUp :size="14" /> Up</UiButton>
      </UiTooltip>
      <UiTooltip text="Refresh current directory" shortcut="Ctrl+R">
        <UiButton size="sm" variant="secondary" :disabled="loading" :loading="loading" @click="$emit('refresh')"><RefreshCw :size="14" /> Refresh</UiButton>
      </UiTooltip>
    </template>
  </UiToolbar>
</template>

<script setup lang="ts">
import {ArrowUp, FolderPlus, RefreshCw, Upload} from '@lucide/vue'
import {UiButton, UiToolbar, UiTooltip} from '../../../shared/ui'
import {sftpViewModes, type SftpViewMode} from '../model/sftpViewMode'

defineProps<{loading?: boolean; viewMode: SftpViewMode}>()
defineEmits<{mkdir: []; refresh: []; up: []; upload: []; 'update:viewMode': [mode: SftpViewMode]}>()

const viewModes = sftpViewModes
</script>
