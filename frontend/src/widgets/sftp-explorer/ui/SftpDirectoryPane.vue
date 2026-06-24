<template>
  <aside class="explorer-scroll sftp-directory-pane" :aria-label="messages.sftp.directoryPane.label">
    <button
      v-for="directory in directories"
      :key="directory.id"
      type="button"
      :title="directory.path"
      @click="$emit('openDirectory', directory.path)"
    >
      <span aria-hidden="true">▸</span>
      <span>{{ directory.name }}</span>
    </button>
    <EmptyState
      v-if="directories.length === 0"
      compact
      icon="↳"
      :title="messages.sftp.directoryPane.emptyTitle"
      :description="messages.sftp.directoryPane.emptyDescription"
    />
  </aside>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {SftpItem} from '../../../entities/sftp'
import {messages} from '../../../shared/copy'
import {EmptyState} from '../../../shared/ui'

const props = defineProps<{items: SftpItem[]}>()
defineEmits<{openDirectory: [path: string]}>()

const directories = computed(() => props.items.filter((item) => item.type === 'directory'))
</script>
