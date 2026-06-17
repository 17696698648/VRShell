<template>
  <div ref="rootRef" class="group-tree-select" :class="{ open }">
    <button type="button" class="group-tree-trigger" @click="emit('toggle')" @keydown="handleTriggerKeydown">
      <span>{{ selectedGroupName }}</span>
      <small>{{ open ? '▴' : '▾' }}</small>
    </button>
    <div v-if="open" class="group-tree-dropdown">
      <template v-for="(node, index) in options" :key="node.group.id">
        <button
          type="button"
          class="group-tree-option"
          :class="{ selected: selectedGroupId === node.group.id, active: activeIndex === index }"
          @click="emit('select', node.group.id)"
          @keydown="handleOptionKeydown($event, node)"
        >
          <span class="tree-spacer" :style="{ width: node.depth * 16 + 'px' }"></span>
          <span
            v-if="node.group.children.length > 0"
            class="tree-toggle"
            @click.stop="emit('toggle-group', $event, node.group)"
          >{{ expandedGroups[node.group.id] ? '▾' : '▸' }}</span>
          <span>{{ normalizeDisplayText(node.group.name) }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {nextTick, ref, watch} from 'vue'
import type {GroupTreeOption} from '../../types/session'
import type {SessionGroup} from '../SessionTreeGroup.vue'

const props = defineProps<{
  open: boolean
  selectedGroupId: string
  selectedGroupName: string
  options: GroupTreeOption[]
  expandedGroups: Record<string, boolean>
  normalizeDisplayText: (value: string) => string
}>()

const emit = defineEmits<{
  (event: 'toggle'): void
  (event: 'close'): void
  (event: 'select', groupId: string): void
  (event: 'toggle-group', mouseEvent: MouseEvent, group: SessionGroup): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

watch(() => props.open, async (open) => {
  if (!open) return

  activeIndex.value = Math.max(0, props.options.findIndex((node) => node.group.id === props.selectedGroupId))
  await nextTick()
  focusActiveOption()
})

function focusActiveOption() {
  const options = rootRef.value?.querySelectorAll<HTMLElement>('.group-tree-option') ?? []
  options[activeIndex.value]?.focus()
}

function moveActive(delta: number) {
  if (props.options.length === 0) return
  activeIndex.value = (activeIndex.value + delta + props.options.length) % props.options.length
  focusActiveOption()
}

function handleTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (!props.open) emit('toggle')
  } else if (event.key === 'Escape') {
    emit('close')
  }
}

function handleOptionKeydown(event: KeyboardEvent, node: GroupTreeOption) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('select', node.group.id)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}
</script>

<style scoped>
.group-tree-select {
  position: relative;
  min-width: 0;
}

.group-tree-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 9px 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 7px;
  background: color-mix(in srgb, var(--idea-bg) 92%, transparent);
  color: #e5edf8;
  text-align: left;
}

.group-tree-select.open .group-tree-trigger {
  border-color: var(--state-border);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent);
}

.group-tree-trigger > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-tree-trigger small {
  color: #8b9bb0;
  font-size: 11px;
}

.group-tree-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: var(--z-dropdown);
  display: grid;
  max-height: 240px;
  padding: 4px;
  border: 1px solid var(--idea-border-strong);
  border-radius: 4px;
  overflow: auto;
  background: var(--idea-panel);
  box-shadow: var(--shadow-popover);
}

.group-tree-option {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  padding: 2px 6px;
  border-radius: 3px;
  background: transparent;
  color: var(--idea-text-muted);
  font-size: 12px;
  text-align: left;
}

.group-tree-option:hover,
.group-tree-option.active {
  background: var(--idea-hover);
  color: var(--idea-text);
}

.group-tree-option.selected {
  background: var(--state-active);
  color: #ffffff;
}

.tree-spacer {
  flex: 0 0 auto;
}

.tree-toggle {
  display: inline-grid;
  width: 12px;
  place-items: center;
  color: #7f8ea3;
  font-size: 10px;
}
</style>
