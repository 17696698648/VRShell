<template>
  <div :class="['sftp-file-list', `sftp-file-list--${displayMode}`]">
    <UiScrollArea axis="x">
      <UiDataGrid :columns="columns" :items="sortedItems" :item-height="30" :get-key="(item) => item.id"
                  custom-scrollbar
                  :label="messages.sftp.treeGrid.label" :empty-text="messages.sftp.treeGrid.emptyText"
                  :selected-key="selectedItemId" :sort-key="sortKey" :sort-direction="sortDirection"
                  @activate="openItem" @contextmenu="openGridMenu" @select="selectItem"
                  @sort="toggleSort($event as SortKey)">
        <template #default="{item, cellProps, gridStyle, rowProps}">
          <article
            v-bind="rowProps"
            :class="['sftp-file-row', 'ui-row', {clickable: item.type === 'directory', selected: selectedItemId === item.id, 'is-selected': selectedItemId === item.id}]"
            :style="gridStyle"
            :title="item.path"
            @click="selectItem(item)"
            @dblclick="openItem(item)"
            @keydown.enter.prevent="openItem(item)"
            @keydown.f2.prevent="renameSftpItem(item)"
            @keydown.delete.prevent="deleteSftpItem(item)"
          >
            <strong v-bind="cellProps(columns[0])" class="sftp-file-row__name">
              <Folder v-if="item.type === 'directory'" :size="16" aria-hidden="true"/>
              <File v-else :size="16" aria-hidden="true"/>
              <span>{{ item.name }}</span>
            </strong>
            <small v-bind="cellProps(columns[1])">{{ item.size }}</small>
            <span v-bind="cellProps(columns[2])" class="sftp-file-row__type">
              {{ item.type === 'directory' ? messages.sftp.treeGrid.directoryType : messages.sftp.treeGrid.fileType }}
            </span>
            <small v-bind="cellProps(columns[3])">{{ item.modifiedAt }}</small>
          </article>
        </template>
      </UiDataGrid>
    </UiScrollArea>
  </div>
</template>

<script setup lang="ts">
import {File, Folder} from '@lucide/vue'
import {computed, ref} from 'vue'
import {persistActiveSftpState, sftpState, type SftpItem} from '../../../entities/sftp'
import {openContextMenu} from '../../../shared/context-menu'
import {messages} from '../../../shared/copy'
import {UiDataGrid, UiScrollArea, type UiDataGridColumn} from '../../../shared/ui'
import {
  createSftpDirectoryMenu,
  createSftpItemMenu,
  deleteSftpItem,
  openSftpItem,
  renameSftpItem
} from '../model/sftpItemActions'

const props = withDefaults(defineProps<{ items: SftpItem[]; displayMode?: 'tree' | 'list' }>(), {displayMode: 'list'})
const emit = defineEmits<{ openDirectory: [path: string] }>()

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
  await openSftpItem(item, {openDirectory: (path) => emit('openDirectory', path)})
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDirection.value = 'asc'
}

function openGridMenu(item: SftpItem | null, _index: number, event: MouseEvent) {
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: item ? createItemMenu(item) : createSftpDirectoryMenu(sftpState.path),
  })
}

function createItemMenu(item: SftpItem) {
  selectItem(item)
  return createSftpItemMenu(item, {
    openDirectory: (path) => emit('openDirectory', path),
    afterRename: () => persistActiveSftpState(),
    afterDelete: () => persistActiveSftpState(),
  })
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
