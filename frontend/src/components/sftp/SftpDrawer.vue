<template>
  <section class="drawer-panel" v-show="visible">
    <template v-if="hasActiveSession">
      <SftpSearch v-model="searchTextModel"/>

      <SftpToolbar
        :search-text="searchText"
        :sort-key="sortKey"
        :sort-direction="sortDirection"
        :searching="searching"
        :result-mode="resultMode"
        @upload="emit('upload')"
        @refresh="emit('refresh')"
        @remote-search="emit('remote-search')"
        @cancel-search="emit('cancel-search')"
        @clear-search="emit('clear-search')"
        @sort="emit('sort', $event)"
      />

      <div v-if="progress.active" class="transfer-progress">
        <div class="transfer-progress-meta">
          <strong>{{ progressLabel }}</strong>
          <span>{{ progress.file }}</span>
          <small>{{ progress.operation === 'delete' ? `${progress.deleted} items` : `${progress.percent}%` }}</small>
        </div>
        <progress v-if="progress.operation !== 'delete'" :value="progress.percent" max="100"></progress>
        <div v-else class="delete-progress-text">Deleting {{ progress.file }} / {{ progress.deleted }}</div>
        <div v-if="progressDetail" class="transfer-progress-detail">{{ progressDetail }}</div>
        <button class="btn small" @click="emit('cancel-transfer')">Cancel</button>
      </div>
      <details v-if="tasks.length > 0" class="sftp-task-center">
        <summary>
          <span>Transfers</span>
          <small>{{ taskSummary }}</small>
          <button type="button" class="task-clear" @click.prevent="emit('clear-task-history')">Clear</button>
        </summary>
        <ul>
          <li v-for="task in tasks.slice(0, 6)" :key="task.id" :class="`task-${task.status}`">
            <span class="task-main">
              <strong>{{ task.type }}</strong>
              <em>{{ task.currentFile || task.status }}</em>
            </span>
            <span class="task-meta">{{ formatTaskMeta(task) }}</span>
          </li>
        </ul>
      </details>


      <div class="sftp-breadcrumb-row">
        <SftpBreadcrumbs :path="path" :breadcrumbs="breadcrumbs" @open-path="emit('open-path', $event)"/>
        <button
          class="bookmark-star"
          :title="props.bookmarks?.includes(path) ? 'Remove bookmark' : 'Add bookmark'"
          @click="props.bookmarks?.includes(path) ? emit('remove-bookmark', path) : emit('add-bookmark', path)"
        >{{ props.bookmarks?.includes(path) ? '¡ï' : '¡î' }}
        </button>
      </div>

      <div v-if="props.bookmarks && props.bookmarks.length > 0" class="sftp-bookmarks">
        <button
          v-for="b in props.bookmarks"
          :key="b"
          class="bookmark-chip"
          :class="{ active: b === path }"
          :title="b"
          @click="emit('open-path', b)"
        >
          {{ b === '/' ? '/' : b.split('/').pop() || b }}
          <span class="bookmark-remove" @click.stop="emit('remove-bookmark', b)">¡Á</span>
        </button>
      </div>

      <SftpTreePanel
        :dragging="dragging"
        :virtual-nodes="virtualNodes"
        :visible-node-count="visibleNodeCount"
        :top-padding="topPadding"
        :bottom-padding="bottomPadding"
        :active-file-path="activeFilePath"
        :pending-drag-upload-directory="pendingDragUploadDirectory"
        :current-path="path"
        :status="status"
        :loading="loading"
        @drag-enter="emit('drag-enter')"
        @drag-leave="emit('drag-leave', $event)"
        @drop="emit('drop', $event)"
        @viewport-update="emit('viewport-update', $event)"
        @open="emit('open', $event)"
        @context-menu="(event, file) => emit('context-menu', event, file)"
        @item-drag-enter="emit('item-drag-enter', $event)"
        @show-info="(event, file) => emit('show-info', event, file)"
        @hide-info="emit('hide-info')"
      />
    </template>

    <section v-else class="sftp-empty">
      <div>No active session</div>
      <small>Double-click a session first, then open SFTP.</small>
    </section>

  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {SftpSortKey, SftpTask, SftpTreeNode} from '../../types'
import SftpBreadcrumbs from './SftpBreadcrumbs.vue'
import SftpSearch from './SftpSearch.vue'
import SftpToolbar from './SftpToolbar.vue'
import SftpTreePanel from './SftpTreePanel.vue'

const props = defineProps<{
  visible: boolean
  hasActiveSession: boolean
  searchText: string
  sortKey: SftpSortKey
  sortDirection: 'asc' | 'desc'
  path: string
  breadcrumbs: Array<{ label: string; path: string }>
  dragging: boolean
  virtualNodes: SftpTreeNode[]
  visibleNodeCount: number
  topPadding: number
  bottomPadding: number
  activeFilePath: string
  pendingDragUploadDirectory: string
  status: string
  searching: boolean
  resultMode: boolean
  loading?: boolean
  bookmarks?: string[]
  progress: {
    active: boolean
    operation: string
    file: string
    percent: number
    deleted: number
    bytesPerSecond?: number
    etaSeconds?: number
  }
  tasks: SftpTask[]
}>()

const emit = defineEmits<{
  (event: 'update:search-text', value: string): void
  (event: 'upload'): void
  (event: 'refresh'): void
  (event: 'remote-search'): void
  (event: 'cancel-search'): void
  (event: 'cancel-transfer'): void
  (event: 'clear-task-history'): void
  (event: 'clear-search'): void
  (event: 'sort', key: SftpSortKey): void
  (event: 'open-path', path: string): void
  (event: 'drag-enter'): void
  (event: 'drag-leave', mouseEvent: DragEvent): void
  (event: 'drop', mouseEvent: DragEvent): void
  (event: 'viewport-update', mouseEvent: Event): void
  (event: 'open', file: SftpTreeNode): void
  (event: 'context-menu', mouseEvent: MouseEvent, file: SftpTreeNode): void
  (event: 'item-drag-enter', file: SftpTreeNode): void
  (event: 'show-info', mouseEvent: MouseEvent, file: SftpTreeNode): void
  (event: 'hide-info'): void
  (event: 'add-bookmark', path: string): void
  (event: 'remove-bookmark', path: string): void
}>()

const searchTextModel = computed({
  get: () => props.searchText,
  set: (value) => emit('update:search-text', value),
})

const progressLabel = computed(() => {
  if (props.progress.operation === 'download') return 'Download'
  if (props.progress.operation === 'delete') return 'Delete'
  return 'Upload'
})

const taskSummary = computed(() => {
  const failed = props.tasks.filter((task) => task.status === 'error').length
  const running = props.tasks.filter((task) => ['queued', 'running', 'canceling'].includes(task.status)).length
  return [running ? `${running} active` : '', failed ? `${failed} failed` : '', `${props.tasks.length} total`]
    .filter(Boolean)
    .join(' ¡¤ ')
})

const progressDetail = computed(() => {
  const parts: string[] = []
  if (props.progress.bytesPerSecond) parts.push(`${formatBytes(props.progress.bytesPerSecond)}/s`)
  if (props.progress.etaSeconds !== undefined) parts.push(`ETA ${formatDuration(props.progress.etaSeconds)}`)
  return parts.join(' ¡¤ ')
})

function formatTaskMeta(task: SftpTask) {
  const value = task.type === 'delete' ? `${task.deleted} items` : `${task.progress}%`
  return task.status === 'error' && task.error ? `${value} ¡¤ ${task.error}` : `${value} ¡¤ ${task.status}`
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--'
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.ceil(seconds % 60)
  return `${minutes}m ${rest}s`
}

</script>

<style scoped>
.drawer-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 280px;
  max-width: 100%;
  box-sizing: border-box;
  min-height: 0;
  padding: 8px 8px;
  border-right: 1px solid var(--idea-border);
  overflow: hidden;
  background: var(--idea-panel);
}

.transfer-progress {
  display: grid;
  gap: 4px;
  padding: 6px;
  border: 1px solid color-mix(in srgb, var(--status-transfer) 32%, transparent);
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--status-transfer-soft), transparent 58%);
  color: #cbd5e1;
  font-size: 11px;
}

.transfer-progress-meta {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
}

.transfer-progress-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sftp-breadcrumb-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bookmark-star {
  flex: 0 0 auto;
  padding: 2px 5px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #fbbf24;
  font-size: 13px;
  cursor: pointer;
}

.bookmark-star:hover {
  background: rgba(251, 191, 36, 0.14);
}

.sftp-bookmarks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.bookmark-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.06);
  color: #94a3b8;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
}

.bookmark-chip:hover {
  background: rgba(56, 189, 248, 0.12);
  color: #e2e8f0;
}

.bookmark-chip.active {
  border-color: rgba(56, 189, 248, 0.3);
  color: #7dd3fc;
}

.bookmark-remove {
  color: #94a3b8;
  font-size: 12px;
}

.bookmark-remove:hover {
  color: #f87171;
}

.transfer-progress progress {
  width: 100%;
  height: 6px;
  accent-color: var(--status-transfer);
}

.transfer-progress-detail {
  color: #94a3b8;
  font-size: 10px;
}

.sftp-task-center {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: var(--radius-sm);
  background: rgba(15, 23, 42, 0.34);
  color: #cbd5e1;
  font-size: 11px;
}

.sftp-task-center summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
}

.sftp-task-center summary small {
  overflow: hidden;
  color: #94a3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-clear {
  border: 0;
  background: transparent;
  color: #7dd3fc;
  font-size: 11px;
  cursor: pointer;
}

.sftp-task-center ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0 8px 8px;
  list-style: none;
}

.sftp-task-center li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 5px 6px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.06);
}

.task-main {
  display: flex;
  gap: 6px;
  min-width: 0;
}

.task-main strong {
  color: #e2e8f0;
  text-transform: capitalize;
}

.task-main em,
.task-meta {
  overflow: hidden;
  color: #94a3b8;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-error .task-meta {
  color: #fca5a5;
}

.task-success .task-meta {
  color: #86efac;
}
</style>
