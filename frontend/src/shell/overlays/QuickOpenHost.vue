<template>
  <Transition name="overlay-fade">
    <div v-if="workspaceState.quickOpenOpen" class="overlay overlay--quick-open" @click.self="closeQuickOpen">
    <section class="command-palette quick-open" role="dialog" aria-label="Quick switcher">
      <label class="command-palette__input">
        <span aria-hidden="true">Search</span>
        <input v-model="query" autofocus placeholder="Switch session or terminal by name, host, tag, or cwd" @keydown.enter.prevent="openSelectedItem" @keydown.escape="closeQuickOpen" @keydown.up.prevent="navigateUp" @keydown.down.prevent="navigateDown" />
      </label>
      <div v-if="groups.length > 0" ref="listRef" class="command-palette__list quick-open__list">
        <section v-for="group in groups" :key="group.kind" class="command-palette__group">
          <h3>{{ group.kind }} <small>{{ group.items.length }}</small></h3>
          <button
            v-for="item in group.items"
            :key="item.id"
            :ref="(el) => setButtonRef(item.id, el as HTMLElement)"
            :class="{selected: isSelected(item.id)}"
            type="button"
            @click="activateQuickOpenItem(item)"
            @mouseenter="selectedIndex = flatIndex(item.id)"
          >
            <span class="command-palette__icon" aria-hidden="true">{{ item.kind === 'terminal' ? 'T' : 'S' }}</span>
            <span>
              <strong v-html="highlightMatch(item.label)" />
              <small v-html="highlightMatch(item.detail)" />
            </span>
            <small class="command-palette__category">{{ item.kind }}</small>
            <kbd>{{ item.status }}</kbd>
          </button>
        </section>
      </div>
      <EmptyState v-else compact icon="Search" title="No sessions or terminals found" description="Try searching by host, tag, terminal title, or current directory." />
    </section>
  </div>
  </Transition>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue'
import {sessionState} from '../../entities/session'
import {terminalState} from '../../entities/terminal'
import {workspaceState} from '../../entities/workspace'
import {activateQuickOpenItem, closeQuickOpen, getQuickOpenItems} from '../../features/workspace/quick-open/quickOpen'
import {EmptyState} from '../../shared/ui'

const query = ref('')
const listRef = ref<HTMLElement | null>(null)
const selectedIndex = ref(0)
const buttonRefs = new Map<string, HTMLElement>()

const items = computed(() => {
  const all = getQuickOpenItems(sessionState.sessions, terminalState.tabs)
  // MRU sort: items with open terminals first, ordered by tab position (last active first)
  const tabOrder = new Map<string, number>()
  terminalState.tabs.forEach((tab, index) => tabOrder.set(tab.id, index))
  return all.sort((a, b) => {
    const aOrder = tabOrder.get(a.id) ?? -1
    const bOrder = tabOrder.get(b.id) ?? -1
    // Items with tabs come first, sorted by most recent (higher index = more recent)
    if (aOrder >= 0 && bOrder >= 0) return bOrder - aOrder
    if (aOrder >= 0) return -1
    if (bOrder >= 0) return 1
    return 0
  })
})
const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return items.value
  return items.value.filter((item) => `${item.label} ${item.detail} ${item.kind} ${item.status}`.toLowerCase().includes(keyword))
})
const groups = computed(() => {
  const kinds = ['terminal', 'session'] as const
  return kinds.map((kind) => ({kind, items: filteredItems.value.filter((item) => item.kind === kind)})).filter((group) => group.items.length > 0)
})

watch(query, () => {
  selectedIndex.value = 0
})

function setButtonRef(id: string, el: HTMLElement | null) {
  if (el) buttonRefs.set(id, el)
  else buttonRefs.delete(id)
}

function isSelected(id: string) {
  return flatIndex(id) === selectedIndex.value
}

function flatIndex(id: string) {
  return filteredItems.value.findIndex((item) => item.id === id)
}

function navigateUp() {
  if (filteredItems.value.length === 0) return
  selectedIndex.value = (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length
  scrollSelectedIntoView()
}

function navigateDown() {
  if (filteredItems.value.length === 0) return
  selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length
  scrollSelectedIntoView()
}

function scrollSelectedIntoView() {
  const item = filteredItems.value[selectedIndex.value]
  if (!item) return
  void nextTick(() => {
    const el = buttonRefs.get(item.id)
    el?.scrollIntoView({block: 'nearest'})
  })
}

function openSelectedItem() {
  const selected = filteredItems.value[selectedIndex.value]
  if (selected) activateQuickOpenItem(selected)
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightMatch(text: string) {
  const keyword = query.value.trim()
  if (!keyword) return escapeHtml(text)
  const escaped = escapeHtml(text)
  const escapedKeyword = escapeHtml(keyword)
  const regex = new RegExp(`(${escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<mark class="quick-open__match">$1</mark>')
}
</script>
