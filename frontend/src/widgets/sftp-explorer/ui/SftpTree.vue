<template>
  <div :class="['sftp-tree', `sftp-tree--${displayMode}`]">
    <UiDataGrid :columns="columns" :items="sortedItems" :item-height="36" :get-key="(item) => item.id" :label="messages.sftp.treeGrid.label" :empty-text="messages.sftp.treeGrid.emptyText" :selected-key="selectedItemId" :sort-key="sortKey" :sort-direction="sortDirection" @activate="openItem" @contextmenu="openGridMenu" @select="selectItem" @sort="toggleSort($event as SortKey)">
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
        >
          <strong v-bind="cellProps(columns[0])" class="sftp-row__name">
            <Folder v-if="item.type === 'directory'" :size="16" aria-hidden="true" />
            <File v-else :size="16" aria-hidden="true" />
            <span>{{ item.name }}</span>
          </strong>
          <small v-bind="cellProps(columns[1])">{{ item.size }}</small>
          <span v-bind="cellProps(columns[2])" class="sftp-row__type">{{ item.type === 'directory' ? messages.sftp.treeGrid.directoryType : messages.sftp.treeGrid.fileType }}</span>
          <small v-bind="cellProps(columns[3])">{{ item.modifiedAt }}</small>
        </article>
      </template>
    </UiDataGrid>
  </div>
</template>

<script setup lang="ts">
import {File, Folder} from '@lucide/vue'
import {computed, ref} from 'vue'
import {persistActiveSftpState, sftpState, type SftpItem} from '../../../entities/sftp'
import {createRemoteDirectory, createRemoteFile, deleteRemoteItem, downloadRemoteItem, openRemoteFileInSessionEditor, renameRemoteItem, uploadFileToRemoteDirectory, uploadFolderToRemoteDirectory} from '../../../features/sftp/manage-files/manageSftpFiles'
import {openContextMenu} from '../../../shared/context-menu'
import {messages} from '../../../shared/copy'
import {requestConfirm, requestPrompt} from '../../../shared/dialog'
import {UiDataGrid, type UiDataGridColumn} from '../../../shared/ui'

const props = withDefaults(defineProps<{items: SftpItem[]; displayMode?: 'tree' | 'list' | 'split'}>(), {displayMode: 'list'})
const emit = defineEmits<{openDirectory: [path: string]}>()

type SortKey = 'type' | 'name' | 'size' | 'modifiedAt'
type SortDirection = 'asc' | 'desc'

const selectedItemId = computed(() => sftpState.selectedItemId || null)
const sortKey = ref<SortKey>('name')
const sortDirection = ref<SortDirection>('asc')
const columns: UiDataGridColumn[] = [
  {id: 'name', title: messages.sftp.treeGrid.columns.name, width: '130px'},
  {id: 'size', title: messages.sftp.treeGrid.columns.size, width: '88px'},
  {id: 'type', title: messages.sftp.treeGrid.columns.type, width: '72px'},
  {id: 'modifiedAt', title: messages.sftp.treeGrid.columns.modified, width: '120px'},
]

const sortedItems = computed(() => {
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return [...props.items].sort((left, right) => {
    if (left.type !== right.type) return left.type === 'directory' ? -1 : 1
    return compareByKey(left, right, sortKey.value) * direction
  })
})

function selectItem(item: SftpItem) {
  sftpState.selectedItemId = item.id
  persistActiveSftpState()
}

async function openItem(item: SftpItem) {
  selectItem(item)
  if (item.type === 'directory') {
    emit('openDirectory', item.path)
    return
  }
  await openRemoteFileInSessionEditor(item)
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
    items: item.type === 'directory' ? directoryItemMenu(item) : fileItemMenu(item),
  })
}

function directoryItemMenu(item: SftpItem) {
  return [
    {id: 'open', label: messages.sftp.contextMenu.openFolder, run: () => openItem(item)},
    {id: 'mkdir', label: messages.sftp.contextMenu.newFolder, run: async () => { await createDirectory(item.path) }},
    {id: 'create-file', label: messages.sftp.contextMenu.newFile, run: async () => { await createFile(item.path) }},
    {id: 'upload-file', label: messages.sftp.contextMenu.uploadFile, run: async () => { await uploadFileToRemoteDirectory(item.path) }},
    {id: 'upload-folder', label: messages.sftp.contextMenu.uploadFolder, run: async () => { await uploadFolderToRemoteDirectory(item.path) }},
    {id: 'rename', label: messages.sftp.contextMenu.rename, run: async () => { await renameItem(item) }},
    {id: 'delete', label: messages.sftp.contextMenu.delete, danger: true, run: async () => { await confirmDeleteItem(item) }},
  ]
}

function fileItemMenu(item: SftpItem) {
  return [
    {id: 'open', label: messages.sftp.contextMenu.openFile, run: () => openItem(item)},
    {id: 'download', label: messages.sftp.contextMenu.download, run: async () => { await downloadItem(item) }},
    {id: 'rename', label: messages.sftp.contextMenu.rename, run: async () => { await renameItem(item) }},
    {id: 'delete', label: messages.sftp.contextMenu.delete, danger: true, run: async () => { await confirmDeleteItem(item) }},
  ]
}

function openGridMenu(item: SftpItem | null, _index: number, event: MouseEvent) {
  if (item) {
    openItemMenu(event, item)
    return
  }
  openDirectoryMenu(event)
}

function openDirectoryMenu(event: MouseEvent) {
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {id: 'mkdir', label: messages.sftp.contextMenu.newFolder, run: async () => { await createDirectory() }},
      {id: 'create-file', label: messages.sftp.contextMenu.newFile, run: async () => { await createFile() }},
      {id: 'upload-file', label: messages.sftp.contextMenu.uploadFile, run: async () => { await uploadFileToRemoteDirectory(sftpState.path) }},
      {id: 'upload-folder', label: messages.sftp.contextMenu.uploadFolder, run: async () => { await uploadFolderToRemoteDirectory(sftpState.path) }},
    ],
  })
}

async function downloadItem(item: SftpItem) {
  await downloadRemoteItem(item)
}

async function createDirectory(parentPath = sftpState.path) {
  const name = await requestPrompt({title: messages.sftp.dialogs.newRemoteFolderTitle, label: messages.sftp.dialogs.folderName, confirmLabel: messages.sftp.dialogs.create})
  if (name) await createRemoteDirectory(name, parentPath)
}

async function createFile(parentPath = sftpState.path) {
  const name = await requestPrompt({title: messages.sftp.dialogs.newRemoteFileTitle, label: messages.sftp.dialogs.fileName, confirmLabel: messages.sftp.dialogs.create})
  if (name) await createRemoteFile(name, parentPath)
}

async function renameItem(item: SftpItem) {
  const name = await requestPrompt({title: messages.sftp.dialogs.renameRemoteItemTitle, label: messages.sftp.dialogs.name, value: item.name, confirmLabel: messages.sftp.dialogs.rename})
  if (name) await renameRemoteItem(item, name)
}

async function confirmDeleteItem(item: SftpItem) {
  const confirmed = await requestConfirm({
    title: messages.sftp.dialogs.deleteTitle(item.type),
    message: messages.sftp.treeGrid.deleteMessage(item.path),
    confirmLabel: messages.sftp.dialogs.delete,
    tone: 'danger',
  })
  if (confirmed) await deleteRemoteItem(item)
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
