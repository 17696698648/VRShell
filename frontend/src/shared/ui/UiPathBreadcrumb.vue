<template>
  <nav :class="['ui-path-breadcrumb', {'ui-path-breadcrumb--single-action': !editable}]" :aria-label="label">
    <form v-if="editing" class="ui-path-breadcrumb__input" @submit.prevent="submitPath">
      <input ref="inputRef" v-model="draftPath" aria-label="Remote path" @keydown.escape="cancelEdit" />
    </form>
    <div v-else class="ui-path-breadcrumb__trail">
      <button type="button" title="Open root" @click="$emit('open', '/')">/</button>
      <template v-for="(part, index) in visibleParts" :key="part.path">
        <span aria-hidden="true">{{ index === 0 ? '>' : '/' }}</span>
        <span v-if="part.ellipsis" class="ui-path-breadcrumb__ellipsis" :title="path">...</span>
        <button v-else type="button" :title="`Open ${part.path}`" @click="$emit('open', part.path)">{{ part.label }}</button>
      </template>
    </div>
    <div class="ui-path-breadcrumb__actions">
      <button v-if="!editing && editable" type="button" class="ui-path-breadcrumb__action" title="Edit path" aria-label="Edit path" @click="startEdit">
        <Pencil :size="14" aria-hidden="true" />
      </button>
      <button type="button" class="ui-path-breadcrumb__action" title="Copy current path" aria-label="Copy current path" @click="copyPath">
        <Copy :size="14" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import {Copy, Pencil} from '@lucide/vue'
import {computed, nextTick, ref, watch} from 'vue'

interface BreadcrumbPart {
  ellipsis: boolean
  label: string
  path: string
}

const props = withDefaults(defineProps<{editable?: boolean; label?: string; path: string}>(), {editable: true, label: 'Path breadcrumbs'})
const emit = defineEmits<{open: [path: string]}>()
const editing = ref(false)
const draftPath = ref(props.path)
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => props.path, (path) => {
  if (!editing.value) draftPath.value = path
})

const pathParts = computed<BreadcrumbPart[]>(() => {
  const segments = props.path.split('/').filter(Boolean)
  return segments.map((segment, index) => ({ellipsis: false, label: segment, path: `/${segments.slice(0, index + 1).join('/')}`}))
})
const visibleParts = computed<BreadcrumbPart[]>(() => {
  if (pathParts.value.length <= 4) return pathParts.value
  return [pathParts.value[0], {ellipsis: true, label: '...', path: '__ellipsis__'}, ...pathParts.value.slice(-2)]
})

function startEdit() {
  editing.value = true
  draftPath.value = props.path
  void nextTick(() => inputRef.value?.focus())
}

function cancelEdit() {
  editing.value = false
  draftPath.value = props.path
}

function submitPath() {
  const path = normalizePath(draftPath.value)
  editing.value = false
  emit('open', path)
}

async function copyPath() {
  await navigator.clipboard?.writeText(props.path)
}

function normalizePath(path: string) {
  const normalized = path.trim()
  if (!normalized) return '/'
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}
</script>
