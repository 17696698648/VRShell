<template>
  <aside class="sftp-directory-pane" aria-label="Remote directories">
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
      title="No folders"
      description="This path has no child directories."
    />
  </aside>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {SftpItem} from '../../../entities/sftp'
import {EmptyState} from '../../../shared/ui'

const props = defineProps<{items: SftpItem[]}>()
defineEmits<{openDirectory: [path: string]}>()

const directories = computed(() => props.items.filter((item) => item.type === 'directory'))
</script>
