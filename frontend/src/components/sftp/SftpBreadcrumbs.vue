<template>
  <div class="path-card compact-path-card sftp-path-card">
    <div class="path-breadcrumb" :title="path">
      <template v-for="(part, index) in breadcrumbs" :key="part.path">
        <ChevronRight v-if="index > 0" :size="10" class="breadcrumb-separator" />
        <button @click="emit('open-path', part.path)">{{ part.label }}</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'

defineProps<{
  path: string
  breadcrumbs: Array<{ label: string; path: string }>
}>()

const emit = defineEmits<{
  (event: 'open-path', path: string): void
}>()
</script>

<style scoped>
.path-card {
  border: 1px solid rgba(148, 163, 184, 0.13);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.5);
}

.compact-path-card {
  display: flex;
  gap: 4px;
  align-items: center;
  min-height: 26px;
  padding: 3px 4px;
}

.sftp-path-card {
  position: relative;
  z-index: 4;
  flex: 0 0 auto;
  border-color: rgba(148, 163, 184, 0.1);
  background: var(--idea-panel);
}

.path-breadcrumb {
  display: flex;
  flex: 1 1 auto;
  gap: 2px;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.path-breadcrumb button {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  padding: 2px 5px;
  border: 0;
  border-radius: 4px;
  background: rgba(30, 41, 59, 0.86);
  color: #94a3b8;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background 0.14s ease, color 0.14s ease;
}

.path-breadcrumb button:hover {
  background: rgba(59, 130, 246, 0.18);
  color: #dbeafe;
}

.breadcrumb-separator {
  flex: 0 0 auto;
  color: rgba(148, 163, 184, 0.4);
}
</style>
