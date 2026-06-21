<template>
  <div class="ui-tabs" role="tablist">
    <button
      v-for="item in items"
      :key="item.id"
      :class="['ui-tabs__item', {active: item.id === activeId, dirty: item.dirty, pinned: item.pinned}]"
      type="button"
      role="tab"
      :aria-selected="item.id === activeId"
      :title="item.title"
      @click="emit('activate', item.id)"
      @keydown.enter.prevent="emit('activate', item.id)"
    >
      <span v-if="item.status" :class="['ui-tabs__status', item.status]" />
      <slot name="item" :item="item">
        <span>{{ item.title }}</span>
      </slot>
      <span v-if="item.dirty" aria-label="Unsaved changes">•</span>
      <button v-if="item.closable" type="button" aria-label="Close tab" @click.stop="emit('close', item.id)">×</button>
    </button>
  </div>
</template>

<script setup lang="ts">
export interface UiTabItem {
  closable?: boolean
  dirty?: boolean
  id: string
  pinned?: boolean
  status?: 'connecting' | 'connected' | 'warning' | 'error' | 'disconnected'
  title: string
}

defineProps<{
  activeId: string | null
  items: UiTabItem[]
}>()

const emit = defineEmits<{
  activate: [id: string]
  close: [id: string]
}>()
</script>
