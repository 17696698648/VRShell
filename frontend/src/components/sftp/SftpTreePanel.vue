<template>
  <section
    class="file-list tree-file-list"
    :class="{ dragging }"
    @dragenter.prevent="emit('drag-enter')"
    @dragover.prevent="emit('drag-enter')"
    @dragleave="emit('drag-leave', $event)"
    @drop.prevent="emit('drop', $event)"
    @scroll="emit('viewport-update', $event)"
    @mouseenter="emit('viewport-update', $event)"
  >
    <div v-if="dragging" class="upload-drop-hint">上传到 {{ dropTargetLabel }}</div>

    <template v-if="loading">
      <SftpTreeSkeleton :count="8"/>
    </template>

    <template v-else>
      <div :style="{ height: `${topPadding}px` }"></div>
      <SftpTreeRow
        v-for="file in virtualNodes"
        :key="file.path"
        :file="file"
        :active="activeFilePath === file.path"
        :drop-target="pendingDragUploadDirectory === file.path"
        @open="emit('open', $event)"
        @context-menu="(event, file) => emit('context-menu', event, file)"
        @drag-enter="emit('item-drag-enter', $event)"
        @show-info="(event, file) => emit('show-info', event, file)"
        @hide-info="emit('hide-info')"
      />
      <div :style="{ height: `${bottomPadding}px` }"></div>
      <div v-if="visibleNodeCount === 0 && !status" class="sftp-status">No files</div>
      <div v-if="status" class="sftp-status">{{ status }}</div>
    </template>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {SftpTreeNode} from '../../types'
import SftpTreeRow from './SftpTreeRow.vue'
import SftpTreeSkeleton from './SftpTreeSkeleton.vue'

const props = defineProps<{
  dragging: boolean
  virtualNodes: SftpTreeNode[]
  visibleNodeCount: number
  topPadding: number
  bottomPadding: number
  activeFilePath: string
  pendingDragUploadDirectory: string
  currentPath: string
  status: string
  loading?: boolean
}>()

const dropTargetLabel = computed(() => props.pendingDragUploadDirectory || props.currentPath)

const emit = defineEmits<{
  (event: 'drag-enter'): void
  (event: 'drag-leave', mouseEvent: DragEvent): void
  (event: 'drop', mouseEvent: DragEvent): void
  (event: 'viewport-update', mouseEvent: Event): void
  (event: 'open', file: SftpTreeNode): void
  (event: 'context-menu', mouseEvent: MouseEvent, file: SftpTreeNode): void
  (event: 'item-drag-enter', file: SftpTreeNode): void
  (event: 'show-info', mouseEvent: MouseEvent, file: SftpTreeNode): void
  (event: 'hide-info'): void
}>()
</script>

<style scoped>
.file-list {
  position: relative;
  z-index: 1;
  display: grid;
  flex: 1 1 auto;
  align-content: start;
  gap: 2px;
  min-height: 0;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-top: 4px;
  padding-right: 2px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  /* vertical scrollbar hidden by default, shown on panel hover */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  transition: scrollbar-color 0.18s ease;
}

.file-list:hover {
  scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
}

.file-list::-webkit-scrollbar {
  width: 5px;
}

.file-list::-webkit-scrollbar-track {
  background: transparent;
}

.file-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: transparent;
  transition: background 0.18s ease;
}

.file-list:hover::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
}

.file-list:hover::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.6);
}

.upload-drop-hint {
  position: sticky;
  top: 4px;
  left: 6px;
  z-index: 8;
  justify-self: start;
  max-width: calc(100% - 12px);
  overflow: hidden;
  padding: 5px 8px;
  border: 1px solid rgba(125, 211, 252, 0.36);
  border-radius: 8px;
  background: rgba(8, 47, 73, 0.92);
  color: #bae6fd;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}
</style>
