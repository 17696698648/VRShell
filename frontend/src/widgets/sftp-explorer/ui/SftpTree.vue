<template>
  <div :class="['sftp-tree', `sftp-tree--${displayMode}`]">
    <UiDataGrid :columns="columns" :items="sortedItems" :item-height="36" :get-key="(item) => item.id" label="Remote files" empty-text="No remote files" :selected-key="selectedItemId" :sort-key="sortKey" :sort-direction="sortDirection" @activate="openItem" @contextmenu="openGridMenu" @select="selectItem" @sort="toggleSort($event as SortKey)">
      <template #default="{item, cellProps, gridStyle, rowProps}">
        <article
          v-bind="rowProps"
          :class="['sftp-row', {clickable: item.type === 'directory', selected: selectedItemId === item.id}]"
          :style="gridStyle"
          :title="item.path"
          @click="selectItem(item)"
          @dblclick="openItem(item)"
          @keydown.enter.prevent="openItem(item)"
          @keydown.f2.prevent="renameItem(item)"
          @keydown.delete.prevent="confirmDeleteItem(item)"
          @contextmenu.prevent="openItemMenu($event, item)"
        >
          <strong v-bind="cellProps(columns[0])" class="sftp-row__name">
            <Folder v-if="item.type === 'directory'" :size="16" aria-hidden="true" />
            <File v-else :size="16" aria-hidden="true" />
            <span>{{ item.name }}</span>
          </strong>
          <small v-bind="cellProps(columns[1])">{{ item.size }}</small>
          <span v-bind="cellProps(columns[2])" class="sftp-row__type">{{ item.type === 'directory' ? 'DIR' : 'FILE' }}</span>
          <small v-bind="cellProps(columns[3])">{{ item.modifiedAt }}</small>
        </article>
      </template>
    </UiDataGrid>
  </div>
</template>

<script setup lang="ts">
import {File, Folder} from '@lucide/vue'
import {computed, ref} from 'vue'
import {workspaceState} from '../../../entities/workspace'
import {sftpState, type SftpItem} from '../../../entities/sftp'
import {createTransferTask, deleteRemoteItem, renameRemoteItem} from '../../../features/sftp/manage-files/manageSftpFiles'
import {openContextMenu} from '../../../shared/context-menu'
import {requestConfirm, requestPrompt} from '../../../shared/dialog'
import {pushToast} from '../../../shared/feedback'
import {UiDataGrid, type UiDataGridColumn} from '../../../shared/ui'

const props = withDefaults(defineProps<{items: SftpItem[]; displayMode?: 'tree' | 'list' | 'split'}>(), {displayMode: 'list'})
const emit = defineEmits<{openDirectory: [path: string]}>()

type SortKey = 'type' | 'name' | 'size' | 'modifiedAt'
type SortDirection = 'asc' | 'desc'

const selectedItemId = ref<string | null>(null)
const sortKey = ref<SortKey>('name')
const sortDirection = ref<SortDirection>('asc')
const columns: UiDataGridColumn[] = [
  {id: 'name', title: 'Name', width: '130px'},
  {id: 'size', title: 'Size', width: '88px'},
  {id: 'type', title: 'Type', width: '72px'},
  {id: 'modifiedAt', title: 'Modified', width: '120px'},
]

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
  if (item.type === 'directory') {
    emit('openDirectory', item.path)
    return
  }
  workspaceState.activeMainView = 'editor'
  workspaceState.mainAreaMode = 'horizontal-split'
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDirection.value = 'asc'
}

function openItemMenu(event: MouseEvent, item: SftpItem) {
  selectItem(item)
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'open', label: item.type === 'directory' ? 'Open directory' : 'Open file', run: () => openItem(item)},
      {id: 'download', label: 'Download', disabled: item.type === 'directory', run: async () => { await downloadItem(item) }},
      {id: 'rename', label: 'Rename', run: async () => { await renameItem(item) }},
      {id: 'copy-path', label: 'Copy path', run: async () => { await copyPath(item) }},
      {id: 'properties', label: 'Properties', run: () => showProperties(item)},
      {id: 'delete', label: 'Delete', danger: true, run: async () => { await confirmDeleteItem(item) }},
    ],
  })
}

function openGridMenu(item: SftpItem, _index: number, event: MouseEvent) {
  openItemMenu(event, item)
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
