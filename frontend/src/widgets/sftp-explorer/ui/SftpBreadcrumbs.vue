<template>
  <nav class="breadcrumbs" aria-label="Remote path breadcrumbs">
    <button type="button" title="Open root" @click="emit('open', '/')">/</button>
    <template v-for="part in pathParts" :key="part.path">
      <span aria-hidden="true">/</span>
      <button type="button" :title="`Open ${part.path}`" @click="emit('open', part.path)">{{ part.label }}</button>
    </template>
    <button class="breadcrumbs__copy" type="button" title="Copy current path" aria-label="Copy current remote path" @click="copyPath">Copy</button>
  </nav>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {pushToast} from '../../../shared/feedback'

const props = defineProps<{path: string}>()
const emit = defineEmits<{open: [path: string]}>()

const pathParts = computed(() => {
  const segments = props.path.split('/').filter(Boolean)
  return segments.map((label, index) => ({
    label,
    path: `/${segments.slice(0, index + 1).join('/')}`,
  }))
})

async function copyPath() {
  if (!navigator.clipboard) {
    pushToast({level: 'warning', title: 'Clipboard unavailable', detail: props.path})
    return
  }
  await navigator.clipboard.writeText(props.path)
  pushToast({level: 'success', title: 'Copied remote path', detail: props.path})
}
</script>
