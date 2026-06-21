<template>
  <header class="panel__header sftp-toolbar" :aria-busy="loading || undefined">
    <div>
      <strong>SFTP</strong>
      <small>{{ loading ? 'Loading remote directory...' : 'Remote files' }}</small>
    </div>
    <div class="panel__actions">
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
      <button type="button" :disabled="loading" title="Create remote directory" @click="$emit('mkdir')">New Folder</button>
      <button type="button" :disabled="loading" title="Upload file to current directory" @click="$emit('upload')">Upload</button>
      <button type="button" :disabled="loading" title="Open parent directory" @click="$emit('up')">Up</button>
      <button type="button" :disabled="loading" title="Refresh current directory" @click="$emit('refresh')">{{ loading ? 'Loading...' : 'Refresh' }}</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import {sftpViewModes, type SftpViewMode} from '../model/sftpViewMode'

defineProps<{loading?: boolean; viewMode: SftpViewMode}>()
defineEmits<{mkdir: []; refresh: []; up: []; upload: []; 'update:viewMode': [mode: SftpViewMode]}>()

const viewModes = sftpViewModes
</script>
