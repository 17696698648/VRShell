<template>
  <UiPathBreadcrumb class="breadcrumbs" :editable="false" :label="messages.sftp.directoryTree.breadcrumbs" :path="path" @open="emit('open', $event)" />
</template>

<script setup lang="ts">
import {messages} from '../../../shared/copy'
import {UiPathBreadcrumb} from '../../../shared/ui'

defineProps<{path: string}>()
const emit = defineEmits<{open: [path: string]}>()
</script>
