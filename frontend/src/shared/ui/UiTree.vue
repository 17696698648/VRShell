<template>
  <div class="ui-tree" role="tree" :aria-label="label" @keydown.down.prevent="focusSibling(1)" @keydown.up.prevent="focusSibling(-1)">
    <UiVirtualList :items="items" :item-height="itemHeight" :get-key="getKey">
      <template #default="slotProps">
        <slot :item="slotProps.item" :index="slotProps.index" />
      </template>
    </UiVirtualList>
  </div>
</template>

<script setup lang="ts" generic="T">
import UiVirtualList from './UiVirtualList.vue'

withDefaults(defineProps<{getKey: (item: T, index: number) => string; itemHeight?: number; items: T[]; label?: string}>(), {itemHeight: 34, label: 'Tree'})

function focusSibling(direction: 1 | -1) {
  const items = Array.from(document.activeElement?.closest('.ui-tree')?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])
  const index = items.indexOf(document.activeElement as HTMLElement)
  const next = items[Math.max(0, Math.min(items.length - 1, index + direction))]
  next?.focus()
}
</script>
