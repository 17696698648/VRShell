<template>
  <UiPathBreadcrumb class="breadcrumbs" label="Remote path breadcrumbs" :path="path" @open="emit('open', $event)" />
</template>

<script setup lang="ts">
import {UiPathBreadcrumb} from '../../../shared/ui'

defineProps<{path: string}>()
const emit = defineEmits<{open: [path: string]}>()
</script>
