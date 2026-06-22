<template>
  <div class="ui-tree" role="tree" :aria-label="label" @keydown="handleKeydown">
    <UiVirtualList :items="items" :item-height="itemHeight" :get-key="getKey">
      <template #default="slotProps">
        <slot :item="slotProps.item" :index="slotProps.index" :tree-item-props="getTreeItemProps(slotProps.item, slotProps.index)" />
      </template>
    </UiVirtualList>
  </div>
</template>

<script setup lang="ts" generic="T">
import UiVirtualList from './UiVirtualList.vue'

const props = withDefaults(defineProps<{activeIndex?: number; expandedKeys?: string[]; getKey: (item: T, index: number) => string; getLevel?: (item: T, index: number) => number; getParentKey?: (item: T, index: number) => string | null; itemHeight?: number; items: T[]; label?: string; selectedKey?: string | null}>(), {activeIndex: -1, expandedKeys: () => [], getLevel: () => 1, getParentKey: () => null, itemHeight: 34, label: 'Tree', selectedKey: null})
const emit = defineEmits<{select: [item: T, index: number, key: string]; toggle: [item: T, index: number, key: string]}>()

function handleKeydown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'ArrowRight', 'ArrowLeft'].includes(event.key)) return
  const root = event.currentTarget as HTMLElement
  const treeItems = Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]'))
  if (treeItems.length === 0) return
  const index = treeItems.indexOf(document.activeElement as HTMLElement)
  const currentIndex = index === -1 ? 0 : index
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectItem(currentIndex)
    return
  }
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    toggleItem(currentIndex)
    return
  }
  event.preventDefault()
  const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? treeItems.length - 1 : event.key === 'ArrowUp' ? Math.max(0, currentIndex - 1) : Math.min(treeItems.length - 1, currentIndex + 1)
  treeItems[nextIndex]?.focus()
}

function getTreeItemProps(item: T, index: number) {
  const key = props.getKey(item, index)
  const selected = props.selectedKey === key || (props.selectedKey === null && (props.activeIndex === index || (props.activeIndex < 0 && index === 0)))
  const expanded = props.expandedKeys.includes(key)
  return {
    'aria-expanded': hasChildren(key) ? expanded : undefined,
    'aria-level': props.getLevel(item, index),
    'aria-posinset': index + 1,
    'aria-selected': selected,
    'aria-setsize': props.items.length,
    role: 'treeitem',
    tabindex: selected ? 0 : -1,
    onClick: () => emit('select', item, index, key),
  }
}

function hasChildren(key: string) {
  return props.items.some((item, index) => props.getParentKey(item, index) === key)
}

function selectItem(index: number) {
  const item = props.items[index]
  if (!item) return
  emit('select', item, index, props.getKey(item, index))
}

function toggleItem(index: number) {
  const item = props.items[index]
  if (!item) return
  emit('toggle', item, index, props.getKey(item, index))
}
</script>
