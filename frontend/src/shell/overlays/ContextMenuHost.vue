<template>
  <Transition name="ctx-menu">
    <div v-if="contextMenuState.menu" class="context-menu-layer" @pointerdown.self="closeContextMenu" @contextmenu.prevent="closeContextMenu">
    <div ref="menuRef" class="context-menu" :style="menuStyle" role="menu" @click.stop @keydown.up.prevent="navigateUp" @keydown.down.prevent="navigateDown" @keydown.enter.prevent="runSelected" @keydown.escape="closeContextMenu">
      <template v-for="(item, index) in contextMenuState.menu.items" :key="item.id">
        <div v-if="item.type === 'separator'" class="context-menu__separator" role="separator" />
        <button
          v-else
          :ref="(el) => setButtonRef(index, el as HTMLElement)"
          type="button"
          role="menuitem"
          :disabled="item.disabled"
          :class="{'context-menu__danger': item.danger, selected: index === selectedIndex}"
          @click="executeContextMenuItem(item)"
          @mouseenter="selectedIndex = index"
        >
          {{ item.label }}
        </button>
      </template>
    </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {closeContextMenu, contextMenuState, executeContextMenuItem, type ContextMenuItem} from '../../shared/context-menu'
import {getContextMenuPosition} from '../../shared/context-menu/contextMenuPosition'

const menuRef = ref<HTMLElement | null>(null)
const selectedIndex = ref(-1)
const buttonRefs = new Map<number, HTMLElement>()
const viewportSize = ref({width: typeof window === 'undefined' ? 0 : window.innerWidth, height: typeof window === 'undefined' ? 0 : window.innerHeight})
const menuSize = ref({width: 0, height: 0})
const viewportMargin = 8

const menuStyle = computed(() => {
  const position = getContextMenuPosition({
    menuHeight: menuSize.value.height,
    menuWidth: menuSize.value.width,
    requestedX: contextMenuState.menu?.x ?? 0,
    requestedY: contextMenuState.menu?.y ?? 0,
    viewportHeight: viewportSize.value.height,
    viewportMargin,
    viewportWidth: viewportSize.value.width,
  })
  return {
    left: `${position.left}px`,
    top: `${position.top}px`,
  }
})

const actionableItems = computed(() =>
  contextMenuState.menu?.items.filter((item) => item.type !== 'separator' && !item.disabled) ?? [],
)

watch(() => contextMenuState.menu, () => {
  selectedIndex.value = -1
  void nextTick(() => {
    measureMenu()
    const first = actionableItems.value[0]
    if (first) {
      const idx = contextMenuState.menu?.items.indexOf(first) ?? -1
      if (idx >= 0) selectedIndex.value = idx
    }
    const firstBtn = menuRef.value?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    firstBtn?.focus()
  })
}, {immediate: true})

onMounted(() => window.addEventListener('resize', updateViewportSize))
onUnmounted(() => window.removeEventListener('resize', updateViewportSize))

function setButtonRef(index: number, el: HTMLElement | null) {
  if (el) buttonRefs.set(index, el)
  else buttonRefs.delete(index)
}

function isDisabled(item: ContextMenuItem | undefined): boolean {
  if (!item) return false
  if (item.type === 'separator') return true
  return item.disabled ?? false
}

function navigateUp() {
  const items = contextMenuState.menu?.items ?? []
  let next = selectedIndex.value
  do {
    next = (next - 1 + items.length) % items.length
  } while (isDisabled(items[next]))
  selectedIndex.value = next
  buttonRefs.get(next)?.focus()
}

function navigateDown() {
  const items = contextMenuState.menu?.items ?? []
  let next = selectedIndex.value
  do {
    next = (next + 1) % items.length
  } while (isDisabled(items[next]))
  selectedIndex.value = next
  buttonRefs.get(next)?.focus()
}

async function runSelected() {
  const items = contextMenuState.menu?.items ?? []
  const item = items[selectedIndex.value]
  if (item && item.type !== 'separator' && !item.disabled) {
    await executeContextMenuItem(item)
  }
}

function updateViewportSize() {
  viewportSize.value = {width: window.innerWidth, height: window.innerHeight}
  void nextTick(measureMenu)
}

function measureMenu() {
  const rect = menuRef.value?.getBoundingClientRect()
  if (!rect) return
  menuSize.value = {width: rect.width, height: rect.height}
}

</script>
