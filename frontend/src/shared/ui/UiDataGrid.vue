<template>
  <div class="ui-data-grid" role="grid" :aria-label="label" :aria-rowcount="items.length + 1" :aria-colcount="columns.length" @keydown="handleGridKeydown">
    <div class="ui-data-grid__header" role="row" :style="gridStyle">
      <button v-for="column in columns" :key="column.id" type="button" role="columnheader" :aria-sort="ariaSort(column.id)" @click="$emit('sort', column.id)">
        {{ column.title }} <UiSortIndicator :active="sortKey === column.id" :direction="sortDirection" />
      </button>
    </div>
    <div v-if="items.length === 0" class="ui-data-grid__empty" role="row">
      <slot name="empty">
        <span role="gridcell" :aria-colspan="columns.length">{{ emptyText }}</span>
      </slot>
    </div>
    <UiVirtualList v-else :items="items" :item-height="itemHeight" :get-key="getKey">
      <template #default="slotProps">
        <slot :item="slotProps.item" :index="slotProps.index" :grid-style="gridStyle" :row-props="getRowProps(slotProps.item, slotProps.index)" />
      </template>
    </UiVirtualList>
  </div>
</template>

<script setup lang="ts" generic="T">
import {computed} from 'vue'
import UiSortIndicator from './UiSortIndicator.vue'
import UiVirtualList from './UiVirtualList.vue'

export interface UiDataGridColumn {
  id: string
  title: string
  width?: string
}

const props = withDefaults(
  defineProps<{columns: UiDataGridColumn[]; emptyText?: string; getKey: (item: T, index: number) => string; itemHeight?: number; items: T[]; label?: string; selectedKey?: string | null; sortDirection?: 'asc' | 'desc'; sortKey?: string}>(),
  {emptyText: 'No data', itemHeight: 36, label: 'Data grid', selectedKey: null, sortDirection: 'asc', sortKey: ''},
)
const emit = defineEmits<{activate: [item: T, index: number]; contextmenu: [item: T, index: number, event: MouseEvent]; select: [item: T, index: number, key: string]; sort: [columnId: string]}>()

const gridStyle = computed(() => ({'--ui-data-grid-template': props.columns.map((column) => column.width ?? 'minmax(0, 1fr)').join(' ')}))

function ariaSort(columnId: string) {
  if (props.sortKey !== columnId) return 'none'
  return props.sortDirection === 'asc' ? 'ascending' : 'descending'
}

function getRowProps(item: T, index: number) {
  const key = props.getKey(item, index)
  const selected = props.selectedKey === key || (props.selectedKey === null && index === 0)
  return {
    'aria-colcount': props.columns.length,
    'aria-rowindex': index + 2,
    'aria-selected': selected,
    class: {'ui-data-grid__row--selected': selected},
    role: 'row',
    tabindex: selected ? 0 : -1,
    onClick: () => emit('select', item, index, key),
    onContextmenu: (event: MouseEvent) => {
      event.preventDefault()
      emit('contextmenu', item, index, event)
    },
    onKeydown: (event: KeyboardEvent) => {
      if (event.key === 'Enter') emit('activate', item, index)
      if (event.key === ' ') {
        event.preventDefault()
        emit('select', item, index, key)
      }
      if (event.key === 'F10' && event.shiftKey) emit('contextmenu', item, index, event as unknown as MouseEvent)
    },
  }
}

function handleGridKeydown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const rows = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="row"][tabindex]'))
  if (rows.length === 0) return
  const index = rows.indexOf(document.activeElement as HTMLElement)
  const currentIndex = index === -1 ? 0 : index
  const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : event.key === 'ArrowUp' ? Math.max(0, currentIndex - 1) : Math.min(rows.length - 1, currentIndex + 1)
  event.preventDefault()
  rows[nextIndex]?.focus()
}
</script>
