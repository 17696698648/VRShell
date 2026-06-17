<template>
  <div class="sftp-toolbar">
    <UiButton title="Upload" v-tooltip="{ text: 'Upload', placement: 'bottom' }" @click="emit('upload')">
      <Upload :size="11"/>
      <span>上传</span>
    </UiButton>
    <UiButton title="Refresh" v-tooltip="{ text: 'Refresh', placement: 'bottom' }" @click="emit('refresh')">
      <RefreshCw :size="11"/>
      <span>刷新</span>
    </UiButton>
    <UiButton title="Remote recursive search"
              v-tooltip="{ text: 'Remote recursive search', placement: 'bottom', disabled: !searchText || searching }"
              :disabled="!searchText || searching" @click="emit('remote-search')">
      <Search :size="11"/>
      <span>远程搜索</span>
    </UiButton>
    <UiButton v-if="searching" title="Cancel remote search"
              v-tooltip="{ text: 'Cancel remote search', placement: 'bottom' }" @click="emit('cancel-search')">
      <X :size="11"/>
      <span>取消</span>
    </UiButton>
    <UiButton v-if="resultMode" title="Clear search results"
              v-tooltip="{ text: 'Clear search results', placement: 'bottom' }" @click="emit('clear-search')">
      <Eraser :size="11"/>
      <span>清除结果</span>
    </UiButton>
    <UiButton title="Sort by name" v-tooltip="{ text: 'Sort by name', placement: 'bottom' }"
              @click="emit('sort', 'name')">
      <span>名称</span>
      <component :is="sortIcon('name')" :size="10" class="sort-arrow"/>
    </UiButton>
    <UiButton title="Sort by modified" v-tooltip="{ text: 'Sort by modified', placement: 'bottom' }"
              @click="emit('sort', 'modified')">
      <span>时间</span>
      <component :is="sortIcon('modified')" :size="10" class="sort-arrow"/>
    </UiButton>
  </div>
</template>

<script setup lang="ts">
import {ArrowDown, ArrowUp, Eraser, RefreshCw, Search, Upload, X} from '@lucide/vue'
import type {Component} from 'vue'
import type {SftpSortKey} from '../../types'
import UiButton from '../ui/UiButton.vue'

const props = defineProps<{
  searchText: string
  sortKey: SftpSortKey
  sortDirection: 'asc' | 'desc'
  searching: boolean
  resultMode: boolean
}>()

const emit = defineEmits<{
  (event: 'upload'): void
  (event: 'refresh'): void
  (event: 'remote-search'): void
  (event: 'cancel-search'): void
  (event: 'clear-search'): void
  (event: 'sort', key: SftpSortKey): void
}>()

function sortIcon(key: SftpSortKey): Component | null {
  if (props.sortKey !== key) return null
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}
</script>

<style scoped>
.sftp-toolbar {
  position: relative;
  z-index: 5;
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  padding-bottom: 1px;
  background: var(--idea-panel);
}

.sftp-toolbar :deep(.ui-button) {
  flex: 0 1 auto;
  min-width: 0;
  min-height: 24px;
  padding: 3px 6px;
  font-size: 10px;
  white-space: nowrap;
}

.sort-arrow {
  flex: 0 0 auto;
  color: #60a5fa;
}
</style>
