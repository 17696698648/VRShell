<template>
  <div class="ui-data-grid" role="grid" :aria-label="label">
    <div class="ui-data-grid__header" role="row">
      <button v-for="column in columns" :key="column.id" type="button" role="columnheader" @click="$emit('sort', column.id)">{{ column.title }}</button>
    </div>
    <UiVirtualList :items="items" :item-height="itemHeight" :get-key="getKey">
      <template #default="slotProps">
        <slot :item="slotProps.item" :index="slotProps.index" />
      </template>
    </UiVirtualList>
  </div>
</template>

<script setup lang="ts" generic="T">
import UiVirtualList from './UiVirtualList.vue'

export interface UiDataGridColumn {
  id: string
  title: string
}

withDefaults(defineProps<{columns: UiDataGridColumn[]; getKey: (item: T, index: number) => string; itemHeight?: number; items: T[]; label?: string}>(), {itemHeight: 36, label: 'Data grid'})
defineEmits<{sort: [columnId: string]}>()
</script>
