<template>
  <div :class="['sftp-tree', `sftp-tree--${displayMode}`]" role="treegrid" aria-label="Remote files">
    <div class="sftp-row sftp-row--header" role="row">
      <button type="button" :class="{active: sortKey === 'type'}" :aria-sort="ariaSort('type')" @click="toggleSort('type')">Type {{ sortIndicator('type') }}</button>
      <button type="button" :class="{active: sortKey === 'name'}" :aria-sort="ariaSort('name')" @click="toggleSort('name')">Name {{ sortIndicator('name') }}</button>
      <button type="button" :class="{active: sortKey === 'size'}" :aria-sort="ariaSort('size')" @click="toggleSort('size')">Size {{ sortIndicator('size') }}</button>
      <button type="button" :class="{active: sortKey === 'modifiedAt'}" :aria-sort="ariaSort('modifiedAt')" @click="toggleSort('modifiedAt')">Modified {{ sortIndicator('modifiedAt') }}</button>
      <span>Actions</span>
    </div>
    <article
      v-for="item in sortedItems"
      :key="item.id"
      :class="['sftp-row', {clickable: item.type === 'directory', selected: selectedItemId === item.id}]"
      role="row"
      tabindex="0"
      :aria-selected="selectedItemId === item.id"
      :title="item.path"
      @click="selectItem(item)"
      @dblclick="openItem(item)"
      @keydown.enter.prevent="openItem(item)"
      @keydown.f2.prevent="renameItem(item)"
      @keydown.delete.prevent="confirmDeleteItem(item)"
      @contextmenu.prevent="openItemMenu($event, item)"
    >
      <span class="sftp-row__type">{{ item.type === 'directory' ? 'DIR' : 'FILE' }}</span>
      <strong>{{ item.name }}</strong>
      <small>{{ item.size }}</small>
      <small>{{ item.modifiedAt }}</small>
      <span class="sftp-row__actions">
        <button v-if="item.type === 'directory'" type="button" aria-label="Open directory" title="Open directory" @click.stop="openItem(item)">↵</button>
        <button v-else type="button" aria-label="Download file" title="Download file" @click.stop="downloadItem(item)">⇩</button>
        <button type="button" aria-label="More actions" title="More actions" @click.stop="openItemMenu($event, item)">⋯</button>
      </span>
    </article>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {sftpState, type SftpItem} from '../../../entities/sftp'
import {createTransferTask, deleteRemoteItem, renameRemoteItem} from '../../../features/sftp/manage-files/manageSftpFiles'
import {openContextMenu} from '../../../shared/context-menu'
import {requestConfirm, requestPrompt} from '../../../shared/dialog'
import {pushToast} from '../../../shared/feedback'

const props = withDefaults(defineProps<{items: SftpItem[]; displayMode?: 'tree' | 'list' | 'split'}>(), {displayMode: 'list'})
const emit = defineEmits<{openDirectory: [path: string]}>()

type SortKey = 'type' | 'name' | 'size' | 'modifiedAt'
type SortDirection = 'asc' | 'desc'

const selectedItemId = ref<string | null>(null)
const sortKey = ref<SortKey>('name')
const sortDirection = ref<SortDirection>('asc')

const sortedItems = computed(() => {
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return [...props.items].sort((left, right) => {
    if (left.type !== right.type) return left.type === 'directory' ? -1 : 1
    return compareByKey(left, right, sortKey.value) * direction
  })
})

function selectItem(item: SftpItem) {
  selectedItemId.value = item.id
  sftpState.selectedItemId = item.id
}

function openItem(item: SftpItem) {
  selectItem(item)
  if (item.type === 'directory') emit('openDirectory', item.path)
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDirection.value = 'asc'
}

function sortIndicator(key: SortKey) {
  if (sortKey.value !== key) return ''
  return sortDirection.value === 'asc' ? '↑' : '↓'
}

function ariaSort(key: SortKey) {
  if (sortKey.value !== key) return 'none'
  return sortDirection.value === 'asc' ? 'ascending' : 'descending'
}

function openItemMenu(event: MouseEvent, item: SftpItem) {
  selectItem(item)
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'open', label: item.type === 'directory' ? 'Open directory' : 'Open file', disabled: item.type !== 'directory', run: () => openItem(item)},
      {id: 'download', label: 'Download', disabled: item.type === 'directory', run: async () => { await downloadItem(item) }},
      {id: 'rename', label: 'Rename', run: async () => { await renameItem(item) }},
      {id: 'copy-path', label: 'Copy path', run: async () => { await copyPath(item) }},
      {id: 'properties', label: 'Properties', run: () => showProperties(item)},
      {id: 'delete', label: 'Delete', danger: true, run: async () => { await confirmDeleteItem(item) }},
    ],
  })
}

async function downloadItem(item: SftpItem) {
  if (item.type === 'directory') return
  await createTransferTask('download', item.path)
}

async function renameItem(item: SftpItem) {
  const name = await requestPrompt({title: 'Rename remote item', label: 'Name', value: item.name, confirmLabel: 'Rename'})
  if (name) await renameRemoteItem(item, name)
}

async function confirmDeleteItem(item: SftpItem) {
  const confirmed = await requestConfirm({
    title: `Delete ${item.type}`,
    message: `Delete ${item.path}? This operation cannot be undone.`,
    confirmLabel: 'Delete',
    tone: 'danger',
  })
  if (confirmed) await deleteRemoteItem(item)
}

function showProperties(item: SftpItem) {
  pushToast({
    level: 'info',
    title: item.name,
    detail: `${item.type} · ${item.size} · modified ${item.modifiedAt} · ${item.path}`,
  })
}

async function copyPath(item: SftpItem) {
  if (!navigator.clipboard) {
    pushToast({level: 'warning', title: 'Clipboard unavailable', detail: item.path})
    return
  }
  await navigator.clipboard.writeText(item.path)
  pushToast({level: 'success', title: 'Copied remote path', detail: item.path})
}

function compareByKey(left: SftpItem, right: SftpItem, key: SortKey) {
  if (key === 'size') return parseSize(left.size) - parseSize(right.size)
  return String(left[key]).localeCompare(String(right[key]), undefined, {numeric: true, sensitivity: 'base'})
}

function parseSize(size: string) {
  const normalized = size.trim().toLowerCase()
  const value = Number.parseFloat(normalized)
  if (Number.isNaN(value)) return 0
  if (normalized.includes('gb')) return value * 1024 * 1024 * 1024
  if (normalized.includes('mb')) return value * 1024 * 1024
  if (normalized.includes('kb')) return value * 1024
  return value
}
</script>
