import { computed, ref, type Ref } from 'vue'
import type { SftpTreeNode } from '../types'

export function useQuickOpen(nodes: Ref<SftpTreeNode[]>, openNode: (node: SftpTreeNode) => void) {
  const quickOpenVisible = ref(false)
  const quickOpenQuery = ref('')
  const quickOpenInputRef = ref<HTMLInputElement | null>(null)
  const quickOpenSelectedIndex = ref(0)

  const quickOpenFilteredNodes = computed(() => {
    const query = quickOpenQuery.value.toLowerCase()
    const allNodes = nodes.value

    if (!query) {
      return allNodes.filter((node) => !node.isDirectory).slice(0, 20)
    }

    return allNodes.filter((node) => node.name.toLowerCase().includes(query)).slice(0, 12)
  })

  function openQuickOpen() {
    quickOpenVisible.value = true
    quickOpenQuery.value = ''
    quickOpenSelectedIndex.value = 0
    setTimeout(() => quickOpenInputRef.value?.focus(), 50)
  }

  function closeQuickOpen() {
    if (!quickOpenVisible.value) return false
    quickOpenVisible.value = false
    return true
  }

  function quickOpenNext() {
    quickOpenSelectedIndex.value = Math.min(quickOpenSelectedIndex.value + 1, quickOpenFilteredNodes.value.length - 1)
  }

  function quickOpenPrev() {
    quickOpenSelectedIndex.value = Math.max(quickOpenSelectedIndex.value - 1, 0)
  }

  function quickOpenConfirm() {
    const node = quickOpenFilteredNodes.value[quickOpenSelectedIndex.value]
    if (node) quickOpenSelect(node)
  }

  function quickOpenSelect(node: SftpTreeNode) {
    quickOpenVisible.value = false
    quickOpenQuery.value = ''
    openNode(node)
  }

  return {
    quickOpenVisible,
    quickOpenQuery,
    quickOpenInputRef,
    quickOpenSelectedIndex,
    quickOpenFilteredNodes,
    openQuickOpen,
    closeQuickOpen,
    quickOpenNext,
    quickOpenPrev,
    quickOpenConfirm,
    quickOpenSelect,
  }
}
