import {computed, ref, watch, type WritableComputedRef} from 'vue'
import type {SftpSortKey, SftpTreeNode} from '../../types'
import {filterSftpTree, flattenSftpTree} from './useSftpTree'

export function useSftpViewState(options: {
  sftpTree: WritableComputedRef<SftpTreeNode[]>
  sftpPath: WritableComputedRef<string>
  sftpSearchText: WritableComputedRef<string>
  sftpSortKey: WritableComputedRef<SftpSortKey>
  sftpSortDirection: WritableComputedRef<'asc' | 'desc'>
  rowHeight: number
  overscan: number
}) {
  const sftpTreeScrollTop = ref(0)
  const sftpTreeViewportHeight = ref(0)
  const sortedFlattenedTree = ref<SftpTreeNode[]>([])
  let sftpTreeRafPending = false

  watch(
    () => ({
      tree: options.sftpTree.value,
      key: options.sftpSortKey.value,
      dir: options.sftpSortDirection.value,
      text: options.sftpSearchText.value,
    }),
    ({tree, key, dir, text}) => {
      const keyword = text.toLowerCase()
      sortedFlattenedTree.value = keyword
        ? filterSftpTree(tree, keyword, key, dir)
        : flattenSftpTree(tree, key, dir)
    },
    {deep: true, immediate: true},
  )

  const visibleSftpTreeNodes = computed(() => sortedFlattenedTree.value)
  const virtualSftpTreeStartIndex = computed(() => (
    Math.max(0, Math.floor(sftpTreeScrollTop.value / options.rowHeight) - options.overscan)
  ))
  const virtualSftpTreeVisibleCount = computed(() => (
    Math.ceil(sftpTreeViewportHeight.value / options.rowHeight) + options.overscan * 2
  ))
  const virtualSftpTreeNodes = computed(() => sortedFlattenedTree.value.slice(
    virtualSftpTreeStartIndex.value,
    virtualSftpTreeStartIndex.value + virtualSftpTreeVisibleCount.value,
  ))
  const virtualSftpTreeTopPadding = computed(() => virtualSftpTreeStartIndex.value * options.rowHeight)
  const virtualSftpTreeBottomPadding = computed(() => Math.max(
    0,
    (sortedFlattenedTree.value.length - virtualSftpTreeStartIndex.value - virtualSftpTreeNodes.value.length) * options.rowHeight,
  ))
  const sftpBreadcrumbs = computed(() => {
    const parts = options.sftpPath.value.split('/').filter(Boolean)
    const breadcrumbs = [{label: '/', path: '/'}]
    let currentPath = ''

    parts.forEach((part) => {
      currentPath += `/${part}`
      breadcrumbs.push({label: part, path: currentPath})
    })

    return breadcrumbs
  })

  function setSftpSort(key: SftpSortKey) {
    if (options.sftpSortKey.value === key) {
      options.sftpSortDirection.value = options.sftpSortDirection.value === 'asc' ? 'desc' : 'asc'
      return
    }

    options.sftpSortKey.value = key
    options.sftpSortDirection.value = 'asc'
  }

  function sftpSortLabel(key: SftpSortKey) {
    if (options.sftpSortKey.value !== key) {
      return ''
    }

    return options.sftpSortDirection.value === 'asc' ? '↑' : '↓'
  }

  function updateSftpTreeViewport(event: Event) {
    const target = event.currentTarget as HTMLElement
    const scrollTop = target.scrollTop
    const height = target.clientHeight

    if (sftpTreeRafPending) {
      return
    }

    sftpTreeRafPending = true
    requestAnimationFrame(() => {
      sftpTreeRafPending = false
      sftpTreeScrollTop.value = scrollTop
      sftpTreeViewportHeight.value = height
    })
  }

  return {
    setSftpSort,
    sftpBreadcrumbs,
    sftpSortLabel,
    sftpTreeScrollTop,
    sftpTreeViewportHeight,
    sortedFlattenedTree,
    updateSftpTreeViewport,
    visibleSftpTreeNodes,
    virtualSftpTreeBottomPadding,
    virtualSftpTreeNodes,
    virtualSftpTreeTopPadding,
  }
}
