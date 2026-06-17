import type {Ref, WritableComputedRef} from 'vue'
import {MAX_REMOTE_SEARCH_DIRECTORIES} from '../constants'
import {formatSftpError} from '../services/sftp'
import type {SftpFileItem, SftpTreeNode} from '../types'

function sftpNodeOrChildrenMatch(node: SftpTreeNode, keyword: string): boolean {
  return node.name.toLowerCase().includes(keyword) || node.children.some((child) => sftpNodeOrChildrenMatch(child, keyword))
}

export function useSftpRemoteSearch(options: {
  sftpSearchText: WritableComputedRef<string>
  sftpStatus: WritableComputedRef<string>
  sftpRemoteSearching: Ref<boolean>
  sftpCancelRemoteSearch: Ref<boolean>
  sftpSearchResultMode: Ref<boolean>
  sftpTreeScrollTop: Ref<number>
  sftpTree: WritableComputedRef<SftpTreeNode[]>
  loadSftpTreeRoot: () => Promise<void>
  loadSftpFiles: (path: string) => Promise<SftpFileItem[]>
  createSftpTreeNode: (file: SftpFileItem, depth: number) => SftpTreeNode
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
}) {
  async function remoteSearchSftpTree() {
    const keyword = options.sftpSearchText.value.trim().toLowerCase()
    let searchedDirectories = 0

    if (!keyword) {
      return
    }

    options.sftpStatus.value = 'Remote searching...'
    options.sftpRemoteSearching.value = true
    options.sftpCancelRemoteSearch.value = false
    options.sftpSearchResultMode.value = false

    try {
      await options.loadSftpTreeRoot()

      async function searchNodes(nodes: SftpTreeNode[]) {
        for (const node of nodes) {
          if (options.sftpCancelRemoteSearch.value || !node.isDirectory || searchedDirectories >= MAX_REMOTE_SEARCH_DIRECTORIES) {
            continue
          }

          searchedDirectories += 1
          node.loading = true
          try {
            const children = await options.loadSftpFiles(node.path)
            node.children = children.map((file) => options.createSftpTreeNode(file, node.depth + 1))
            node.loaded = true
            await searchNodes(node.children)
            node.expanded = sftpNodeOrChildrenMatch(node, keyword)
          } finally {
            node.loading = false
          }
        }
      }

      await searchNodes(options.sftpTree.value)
      options.sftpTreeScrollTop.value = 0
      options.sftpSearchResultMode.value = true
      options.sftpStatus.value = options.sftpCancelRemoteSearch.value
        ? 'Remote search canceled'
        : searchedDirectories >= MAX_REMOTE_SEARCH_DIRECTORIES
          ? `Remote search stopped after ${MAX_REMOTE_SEARCH_DIRECTORIES} folders`
          : 'Remote search finished'
    } catch (error) {
      options.sftpStatus.value = `Remote search failed: ${formatSftpError(error)}`
      options.showToast('Remote search failed', 'error')
    } finally {
      options.sftpRemoteSearching.value = false
    }
  }

  function cancelRemoteSearch() {
    options.sftpCancelRemoteSearch.value = true
    options.sftpStatus.value = 'Canceling remote search...'
  }

  function clearSftpSearchResults() {
    options.sftpSearchText.value = ''
    options.sftpSearchResultMode.value = false
    options.sftpStatus.value = ''
  }

  return {
    cancelRemoteSearch,
    clearSftpSearchResults,
    remoteSearchSftpTree,
  }
}
