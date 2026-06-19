<template>
  <nav ref="tabsBarRef" v-if="hasActiveSession" class="tabs-bar session-tabs workspace-tab-bar" aria-label="Open sessions">
    <div ref="tabListRef" class="session-tab-list workspace-tab-list" role="tablist" @scroll="updateScrollState">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.name"
        ref="tabButtonRefs"
        class="session-tab workspace-tab-item"
        role="tab"
        :aria-selected="tab.selected"
        :tabindex="tab.selected ? 0 : -1"
        :class="{ selected: tab.selected }"
        @click="emit('select-session', tab.name)"
        @keydown="handleTabKeydown($event, index)"
        @contextmenu="emit('open-session-menu', $event, tab.name)"
      >
        <span class="tab-status-dot" :class="tab.status"></span>
        <span class="tab-title workspace-tab-title">{{ tab.name }}</span>
        <span class="tab-close workspace-tab-close" role="button" tabindex="0" title="Close" :aria-label="`Close ${tab.name}`" @click.stop="emit('close-session', tab.name)" @keydown.enter.stop="emit('close-session', tab.name)" @keydown.space.prevent.stop="emit('close-session', tab.name)">
          <X :size="12"/>
        </span>
      </button>
    </div>

    <div v-if="hasOverflow" class="tab-overflow-wrap">
      <button
        class="tab-overflow-button"
        :class="{ active: overflowMenuOpen }"
        title="Hidden tabs"
        aria-haspopup="menu"
        :aria-expanded="overflowMenuOpen"
        @click.stop="toggleOverflowMenu"
      >
        <ChevronDown :size="14" class="chevron-icon"/>
      </button>

      <div v-if="overflowMenuOpen" class="tab-overflow-menu" role="menu" @click.stop>
        <div class="tab-overflow-header">
          <span>Hidden Tabs</span>
          <small>{{ hiddenTabs.length }}</small>
        </div>
        <button
          v-for="tab in hiddenTabs"
          :key="'hidden-' + tab.name"
          class="tab-overflow-item"
          role="menuitem"
          :class="{ selected: tab.selected }"
          :title="tab.name"
          @click="selectOverflowTab(tab.name)"
          @contextmenu="emit('open-session-menu', $event, tab.name)"
        >
          <span class="tab-status-dot" :class="tab.status"></span>
          <span class="tab-overflow-title">{{ tab.name }}</span>
          <span v-if="tab.selected" class="tab-overflow-current">Current</span>
        </button>
        <div v-if="hiddenTabs.length === 0" class="tab-overflow-empty">No hidden tabs</div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import {nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {ChevronDown, X} from '@lucide/vue'

type WorkspaceTab = {
  name: string
  selected: boolean
  status: string
}

const props = defineProps<{
  hasActiveSession: boolean
  tabs: WorkspaceTab[]
}>()

const tabsBarRef = ref<HTMLElement | null>(null)
const tabListRef = ref<HTMLDivElement | null>(null)
const tabButtonRefs = ref<HTMLButtonElement[]>([])
const hiddenTabs = ref<WorkspaceTab[]>([])
const hasOverflow = ref(false)
const overflowMenuOpen = ref(false)
let resizeObserver: ResizeObserver | null = null

const emit = defineEmits<{
  (event: 'select-session', sessionName: string): void
  (event: 'close-session', sessionName: string): void
  (event: 'open-session-menu', mouseEvent: MouseEvent, sessionName: string): void
}>()

watch(
  () => props.tabs.map((tab) => `${tab.name}:${tab.selected}`).join('|'),
  async () => {
    await nextTick()
    scrollSelectedTabIntoView()
    updateScrollState()
  },
  {immediate: true},
)

onMounted(async () => {
  await nextTick()
  updateScrollState()

  if (tabListRef.value) {
    resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(tabListRef.value)
  }

  window.addEventListener('resize', updateScrollState)
  document.addEventListener('click', closeOverflowMenuOnOutsideClick)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', updateScrollState)
  document.removeEventListener('click', closeOverflowMenuOnOutsideClick)
})

function scrollSelectedTabIntoView() {
  const selectedIndex = props.tabs.findIndex((tab) => tab.selected)
  tabButtonRefs.value[selectedIndex]?.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'nearest'})
}

function updateScrollState() {
  updateHiddenTabs()

  if (hiddenTabs.value.length === 0) {
    overflowMenuOpen.value = false
  }
}

function updateHiddenTabs() {
  const tabList = tabListRef.value
  if (!tabList) {
    hiddenTabs.value = []
    hasOverflow.value = false
    return
  }

  hasOverflow.value = tabList.scrollWidth > tabList.clientWidth + 1

  const listRect = tabList.getBoundingClientRect()
  hiddenTabs.value = props.tabs.filter((_tab, index) => {
    const tabButton = tabButtonRefs.value[index]
    if (!tabButton) return false

    const tabRect = tabButton.getBoundingClientRect()
    return tabRect.left < listRect.left || tabRect.right > listRect.right
  })
}

function toggleOverflowMenu() {
  updateHiddenTabs()
  overflowMenuOpen.value = hasOverflow.value ? !overflowMenuOpen.value : false
}

function selectOverflowTab(sessionName: string) {
  overflowMenuOpen.value = false
  emit('select-session', sessionName)
}

function handleTabKeydown(event: KeyboardEvent, index: number) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
    return
  }

  event.preventDefault()
  const lastIndex = props.tabs.length - 1
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? lastIndex
      : event.key === 'ArrowLeft'
        ? Math.max(0, index - 1)
        : Math.min(lastIndex, index + 1)
  const nextTab = props.tabs[nextIndex]
  if (nextTab) {
    emit('select-session', nextTab.name)
    nextTick(() => tabButtonRefs.value[nextIndex]?.focus())
  }
}

function closeOverflowMenuOnOutsideClick(event: MouseEvent) {
  if (!tabsBarRef.value?.contains(event.target as Node)) {
    overflowMenuOpen.value = false
  }
}
</script>

<style scoped>
.session-tabs {
  overflow: visible;
}

.tabs-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;
  height: 34px;
  overflow: visible;
  padding: 4px 6px;
  box-sizing: border-box;
}

.session-tabs {
  align-items: center;
  border-bottom: 1px solid #111418;
  background: #1b1d21;
  backdrop-filter: none;
  box-shadow: inset 0 -1px 0 rgba(255,255,255,0.03);
}

.session-tab-list {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-start;
  align-self: center;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: 26px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 18px), transparent 100%);
}

.session-tab-list::-webkit-scrollbar {
  display: none;
}

.session-tab {
  position: relative;
  display: flex;
  gap: 7px;
  align-items: center;
  flex: 0 0 auto;
  height: 26px;
  padding: 0 10px;
  margin: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(39,43,49,0.46);
  color: #9ba7b7;
  font-size: 12px;
  line-height: 1;
  transition: border-color var(--motion-fast), background var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast);
}

.session-tab.selected,
.session-tab:hover {
  border-color: rgba(72,98,125,0.82);
  background: linear-gradient(180deg, rgba(41,65,94,0.78) 0%, rgba(32,54,80,0.72) 100%);
  color: #8ec7ff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.18);
}

.tab-status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #64748b;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.tab-status-dot.idle {
  background: #64748b;
  box-shadow: none;
}

.tab-status-dot.connecting {
  background: var(--status-warning);
  box-shadow: 0 0 10px color-mix(in srgb, var(--status-warning) 52%, transparent);
}

.tab-status-dot.connected {
  background: var(--status-online);
  box-shadow: 0 0 10px color-mix(in srgb, var(--status-online) 52%, transparent);
}

.tab-status-dot.error {
  background: var(--status-danger);
  box-shadow: 0 0 10px color-mix(in srgb, var(--status-danger) 52%, transparent);
}

.tab-title {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 5px;
  color: #aab4c3;
  opacity: 0;
  transition: opacity var(--motion-fast), background var(--motion-fast), color var(--motion-fast);
}

.session-tab:hover .tab-close,
.session-tab.selected .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: rgba(239, 68, 68, 0.18);
  color: #fecdd3;
}

.tab-overflow-wrap {
  position: relative;
  flex: 0 0 auto;
  align-self: stretch;
  display: flex;
  align-items: center;
  background: linear-gradient(90deg, transparent, rgba(27,31,37,0.62) 35%);
}

.tab-overflow-button {
  position: relative;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #9ba7b7;
  outline: 0;
  transition: border-color var(--motion-fast), background var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast);
}

.tab-overflow-button:not(:disabled):hover,
.tab-overflow-button.active {
  border-color: #48627d;
  background: linear-gradient(180deg, #29415e 0%, #203650 100%);
  color: #8ec7ff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.18);
}

.chevron-icon {
  transition: transform 0.15s ease;
}

.tab-overflow-button.active .chevron-icon {
  transform: rotate(-180deg);
}

.tab-overflow-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: var(--z-toast);
  display: grid;
  width: 260px;
  max-height: min(340px, 70vh);
  overflow-y: auto;
  padding: 6px;
  border: 1px solid #3f5268;
  border-radius: 10px;
  background: #20252c;
  box-shadow: 0 14px 36px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.05);
}

.tab-overflow-menu::-webkit-scrollbar {
  width: 6px;
}

.tab-overflow-menu::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.22);
}

.tab-overflow-header,
.tab-overflow-empty {
  padding: 6px 8px;
  color: var(--idea-text-muted);
  font-size: 11px;
}

.tab-overflow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  font-weight: 700;
}

.tab-overflow-header small {
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
}

.tab-overflow-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 7px;
  align-items: center;
  width: 100%;
  min-height: 27px;
  padding: 4px 7px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--idea-text-muted);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--motion-fast), background var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast);
}

.tab-overflow-item:hover,
.tab-overflow-item.selected {
  border-color: #48627d;
  background: linear-gradient(180deg, #29415e 0%, #203650 100%);
  color: #8ec7ff;
}

.tab-overflow-item.selected {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
}

.tab-overflow-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-overflow-current {
  color: var(--accent);
  font-size: 10px;
  font-weight: 800;
}
</style>

<style scoped>
.session-tab:focus-visible,
.tab-overflow-button:focus-visible,
.tab-overflow-item:focus-visible,
.tab-close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
