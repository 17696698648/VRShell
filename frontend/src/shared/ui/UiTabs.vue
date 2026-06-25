<template>
  <div ref="tabsRef" class="ui-tabs" :class="[density]" role="tablist" :aria-label="label" @wheel="handleWheel">
    <button
      v-for="item in items"
      :key="item.id"
      :class="['ui-tabs__item', {active: item.id === activeId, dirty: item.dirty, pinned: item.pinned}]"
      type="button"
      role="tab"
      :aria-selected="item.id === activeId"
      :tabindex="item.id === activeId ? 0 : -1"
      draggable="true"
      :title="item.tooltip ?? item.title"
      @click="emit('activate', item.id)"
      @contextmenu.prevent="emit('contextmenu', item.id, $event)"
      @dragstart="draggedId = item.id"
      @dragover.prevent
      @drop="handleDrop(item.id)"
      @keydown="handleKeydown($event, item.id)"
    >
      <span v-if="item.icon" class="ui-tabs__icon" aria-hidden="true">{{ item.icon }}</span>
      <span v-if="item.status" :class="['ui-tabs__status', item.status]" />
      <slot name="item" :item="item">
        <span>{{ item.title }}</span>
        <small v-if="item.subtitle">{{ item.subtitle }}</small>
      </slot>
      <span v-if="item.dirty" aria-label="Unsaved changes">•</span>
      <button v-if="item.closable" type="button" aria-label="Close tab" @click.stop="emit('close', item.id)"><X :size="13" /></button>
    </button>
  </div>
</template>

<script setup lang="ts">
import {nextTick, ref} from 'vue'
import {X} from '@lucide/vue'

export interface UiTabItem {
  closable?: boolean
  dirty?: boolean
  icon?: string
  id: string
  pinned?: boolean
  status?: 'connecting' | 'connected' | 'warning' | 'error' | 'disconnected'
  subtitle?: string
  title: string
  tooltip?: string
}

const props = withDefaults(defineProps<{
  activeId: string | null
  density?: 'compact' | 'comfortable'
  items: UiTabItem[]
  label?: string
}>(), {density: 'compact', label: 'Tabs'})

const emit = defineEmits<{
  activate: [id: string]
  close: [id: string]
  closeOthers: [id: string]
  contextmenu: [id: string, event: MouseEvent]
  pin: [id: string, pinned: boolean]
  reorder: [sourceId: string, targetId: string]
}>()

const draggedId = ref<string | null>(null)
const tabsRef = ref<HTMLElement | null>(null)

function handleWheel(event: WheelEvent) {
  // Convert vertical scroll to horizontal scroll when tabs overflow
  if (!tabsRef.value) return
  const {scrollWidth, clientWidth} = tabsRef.value
  if (scrollWidth <= clientWidth) return
  
  // If there's horizontal overflow, convert vertical scroll to horizontal
  if (event.deltaY !== 0 && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    event.preventDefault()
    tabsRef.value.scrollLeft += event.deltaY
  }
}

function handleDrop(targetId: string) {
  if (draggedId.value && draggedId.value !== targetId) emit('reorder', draggedId.value, targetId)
  draggedId.value = null
}

function handleKeydown(event: KeyboardEvent, id: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('activate', id)
    return
  }
  if (event.key === 'Delete') {
    const item = props.items.find((tab) => tab.id === id)
    if (item?.closable) emit('close', id)
    return
  }
  if (event.key === 'F10' && event.shiftKey) {
    event.preventDefault()
    emit('contextmenu', id, event as unknown as MouseEvent)
    return
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
  event.preventDefault()
  const index = props.items.findIndex((item) => item.id === id)
  if (index < 0) return
  const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? props.items.length - 1 : event.key === 'ArrowLeft' ? Math.max(0, index - 1) : Math.min(props.items.length - 1, index + 1)
  emit('activate', props.items[nextIndex]?.id ?? id)
  void nextTick(() => {
    const buttons = Array.from((event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])
    buttons[nextIndex]?.focus()
  })
}
</script>
