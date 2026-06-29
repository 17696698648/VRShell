import {computed, ref, watch, type MaybeRefOrGetter, toValue} from 'vue'
import type {SessionHost} from '../../../entities/session'
import type {TerminalTab} from '../../../entities/terminal'
import {getQuickOpenItems, type QuickOpenItem} from './quickOpen'

const QUICK_OPEN_KINDS = ['terminal', 'session'] as const

export function useQuickOpenState(sessions: MaybeRefOrGetter<SessionHost[]>, terminals: MaybeRefOrGetter<TerminalTab[]>) {
  const query = ref('')
  const selectedIndex = ref(0)

  const items = computed(() => sortQuickOpenItems(getQuickOpenItems(toValue(sessions), toValue(terminals)), toValue(terminals)))
  const filteredItems = computed(() => filterQuickOpenItems(items.value, query.value))
  const groups = computed(() => QUICK_OPEN_KINDS.map((kind) => ({kind, items: filteredItems.value.filter((item) => item.kind === kind)})).filter((group) => group.items.length > 0))
  const selectedItem = computed(() => filteredItems.value[selectedIndex.value])

  watch(query, () => {
    selectedIndex.value = 0
  })

  watch(filteredItems, (nextItems) => {
    if (selectedIndex.value >= nextItems.length) selectedIndex.value = Math.max(0, nextItems.length - 1)
  })

  function isSelected(id: string) {
    return selectedItem.value?.id === id
  }

  function flatIndex(id: string) {
    return filteredItems.value.findIndex((item) => item.id === id)
  }

  function navigateUp() {
    if (filteredItems.value.length === 0) return
    selectedIndex.value = (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length
  }

  function navigateDown() {
    if (filteredItems.value.length === 0) return
    selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length
  }

  return {filteredItems, flatIndex, groups, isSelected, items, navigateDown, navigateUp, query, selectedIndex, selectedItem}
}

export function optionId(id: string) {
  return `quick-open-option-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

export function itemAddress(item: QuickOpenItem) {
  return item.detail
}

export function highlightQuickOpenMatch(text: string, query: string) {
  const keyword = query.trim()
  if (!keyword) return escapeHtml(text)
  const escaped = escapeHtml(text)
  const escapedKeyword = escapeHtml(keyword)
  const regex = new RegExp(`(${escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<mark class="quick-open__match">$1</mark>')
}

function sortQuickOpenItems(items: QuickOpenItem[], terminals: TerminalTab[]) {
  const tabOrder = new Map<string, number>()
  terminals.forEach((tab, index) => tabOrder.set(`terminal:${tab.id}`, index))
  return [...items].sort((a, b) => {
    const aOrder = tabOrder.get(a.id) ?? -1
    const bOrder = tabOrder.get(b.id) ?? -1
    if (aOrder >= 0 && bOrder >= 0) return bOrder - aOrder
    if (aOrder >= 0) return -1
    if (bOrder >= 0) return 1
    return 0
  })
}

function filterQuickOpenItems(items: QuickOpenItem[], query: string) {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return items
  return items.filter((item) => `${item.label} ${item.detail} ${item.kind} ${item.status}`.toLowerCase().includes(keyword))
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
