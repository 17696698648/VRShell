import { ref, type Ref, type ComputedRef, type WritableComputedRef } from 'vue'
import { SFTP_TREE_OVERSCAN, SFTP_TREE_ROW_HEIGHT } from '../../constants'
import { listSftpDirectory, type SftpConnection, type SftpEntry } from '../../services/sftp'
import type { SftpFileItem, SftpSortKey, SftpTreeNode } from '../../types'
import { createSftpTreeNode, getSftpFileIcon } from './useSftpTree'

export type UseSftpBrowserOptions = {
  sftpPath: WritableComputedRef<string>
  sftpFiles: WritableComputedRef<SftpFileItem[]>
  sftpTree: WritableComputedRef<SftpTreeNode[]>
  sftpStatus: WritableComputedRef<string>
  sftpSortKey: WritableComputedRef<SftpSortKey>
  sftpSortDirection: WritableComputedRef<'asc' | 'desc'>
  getSftpConnection: () => SftpConnection
  activeSessionName: ComputedRef<string | undefined>
}

export function useSftpBrowser(options: UseSftpBrowserOptions) {
  const {
    sftpPath,
    sftpFiles,
    sftpTree,
    sftpStatus,
    sftpSortKey,
    sftpSortDirection,
    getSftpConnection,
  } = options

  const sftpTreeLoading = ref(false)
  const sftpTreeScrollTop = ref(0)
  const sftpTreeViewportHeight = ref(0)
  const sftpPathHistory = ref<string[]>(['/'])
  const sftpPathHistoryIndex = ref(0)

  // Bookmark management
  const SFTP_BOOKMARKS_KEY = 'vrshell-sftp-bookmarks'
  const sftpBookmarks = ref<string[]>([])

  function loadBookmarks() {
    try {
      sftpBookmarks.value = JSON.parse(localStorage.getItem(SFTP_BOOKMARKS_KEY) || '[]')
    } catch {
      sftpBookmarks.value = []
    }
  }

  function saveBookmarks() {
    localStorage.setItem(SFTP_BOOKMARKS_KEY, JSON.stringify(sftpBookmarks.value))
  }

  function addBookmark(path: string) {
    if (!sftpBookmarks.value.includes(path)) {
      sftpBookmarks.value.push(path)
      saveBookmarks()
    }
  }

  function removeBookmark(path: string) {
    sftpBookmarks.value = sftpBookmarks.value.filter((b) => b !== path)
    saveBookmarks()
  }

  // Path history
  function pushSftpPath(path: string) {
    sftpPathHistory.value = sftpPathHistory.value.slice(0, sftpPathHistoryIndex.value + 1)
    sftpPathHistory.value.push(path)
    sftpPathHistoryIndex.value = sftpPathHistory.value.length - 1
  }

  function navigateSftpBack() {
    if (sftpPathHistoryIndex.value > 0) {
      sftpPathHistoryIndex.value--
      openSftpPath(sftpPathHistory.value[sftpPathHistoryIndex.value])
    }
  }

  function navigateSftpForward() {
    if (sftpPathHistoryIndex.value < sftpPathHistory.value.length - 1) {
      sftpPathHistoryIndex.value++
      openSftpPath(sftpPathHistory.value[sftpPathHistoryIndex.value])
    }
  }

  // File normalization
  function normalizeSftpFile(file: SftpEntry & { sizeBytes?: number; modified?: number; isSymlink?: boolean }): SftpFileItem {
    const isDirectory = file.isDirectory ?? false
    const isSymlink = file.isSymlink ?? false
    const modified = file.modified ?? 0
    const sizeBytes = file.sizeBytes ?? (Number.parseInt(file.size, 10) || 0)
    return {
      name: file.name,
      path: file.path,
      icon: getSftpFileIcon(file.name, isDirectory, isSymlink),
      meta: isDirectory ? 'Folder' : file.size,
      size: isDirectory ? '-' : file.size,
      sizeBytes,
      modified,
      isSymlink,
      modifiedText: modified > 0 ? new Date(modified * 1000).toLocaleString() : '-',
      isDirectory,
    }
  }

  // Load SFTP directory contents
  async function loadSftpFiles(path = sftpPath.value): Promise<SftpFileItem[]> {
    const conn = getSftpConnection()
    if (!conn.host) return []

    sftpStatus.value = 'Loading...'

    try {
      const files = await listSftpDirectory(conn, path)
      const normalizedFiles = files.map(normalizeSftpFile)

      if (path === sftpPath.value) {
        sftpFiles.value = normalizedFiles
        sftpStatus.value = files.length === 0 ? 'Directory is empty' : ''
      }

      return normalizedFiles
    } catch (error) {
      if (path === sftpPath.value) {
        sftpFiles.value = []
        sftpStatus.value = `SFTP failed: ${String(error)}`
      }
      throw error
    }
  }

  // Tree node operations
  function findSftpTreeNode(path: string, nodes = sftpTree.value): SftpTreeNode | null {
    for (const node of nodes) {
      if (node.path === path) return node
      const child = findSftpTreeNode(path, node.children)
      if (child) return child
    }
    return null
  }

  async function refreshSftpTreePath(path = sftpPath.value) {
    if (path === '/') {
      await loadSftpTreeRoot(true)
      return
    }

    const node = findSftpTreeNode(path)
    if (!node || !node.isDirectory) {
      await loadSftpTreeRoot(true)
      return
    }

    const children = await loadSftpFiles(path)
    node.children = children.map((file) => createSftpTreeNode(file, node.depth + 1))
    node.loaded = true
    node.expanded = true
  }

  async function loadSftpTreeRoot(force = false) {
    if (sftpTree.value.length > 0 && !force) {
      sftpPath.value = '/'
      sftpFiles.value = sftpTree.value
      return
    }

    sftpTreeLoading.value = true
    try {
      const rootFiles = await loadSftpFiles('/')
      sftpTree.value = rootFiles.map((file) => createSftpTreeNode(file, 0))
      sftpPath.value = '/'
      sftpFiles.value = rootFiles
      sftpStatus.value = rootFiles.length === 0 ? 'Directory is empty' : ''
    } catch (error) {
      sftpTree.value = []
      sftpFiles.value = []
      sftpStatus.value = `SFTP failed: ${String(error)}`
    } finally {
      sftpTreeLoading.value = false
    }
  }

  async function toggleSftpTreeNode(node: SftpTreeNode, onOpenFile?: (node: SftpTreeNode) => void) {
    if (!node.isDirectory) {
      onOpenFile?.(node)
      return
    }

    sftpPath.value = node.path

    if (node.expanded) {
      node.expanded = false
      sftpFiles.value = node.children
      return
    }

    node.expanded = true

    if (node.loaded) {
      sftpFiles.value = node.children
      return
    }

    node.loading = true
    try {
      const children = await loadSftpFiles(node.path)
      node.children = children.map((file) => createSftpTreeNode(file, node.depth + 1))
      node.loaded = true
      sftpStatus.value = children.length === 0 ? 'Directory is empty' : ''
    } catch (error) {
      node.expanded = false
      sftpStatus.value = `SFTP failed: ${String(error)}`
    } finally {
      node.loading = false
    }
  }

  async function openSftpPath(path: string) {
    sftpPath.value = path
    pushSftpPath(path)
    if (path === '/') {
      await loadSftpTreeRoot()
      return
    }

    const node = findSftpTreeNode(path)
    if (!node) return

    if (!node.expanded) {
      await toggleSftpTreeNode(node)
      return
    }

    sftpFiles.value = node.children
  }

  function openSftpItem(file: SftpFileItem, onOpenFile?: (file: SftpFileItem) => void) {
    if (file.isDirectory) {
      const node = findSftpTreeNode(file.path)
      if (node) toggleSftpTreeNode(node)
      return
    }
    onOpenFile?.(file)
  }

  // Sorting
  function setSftpSort(key: SftpSortKey) {
    if (sftpSortKey.value === key) {
      sftpSortDirection.value = sftpSortDirection.value === 'asc' ? 'desc' : 'asc'
      return
    }
    sftpSortKey.value = key
    sftpSortDirection.value = 'asc'
  }

  function sftpSortLabel(key: SftpSortKey) {
    if (sftpSortKey.value !== key) return ''
    return sftpSortDirection.value === 'asc' ? '↑' : '↓'
  }

  // Virtual scrolling
  let sftpTreeRafPending = false

  function updateSftpTreeViewport(event: Event) {
    const target = event.currentTarget as HTMLElement
    const scrollTop = target.scrollTop
    const height = target.clientHeight
    if (sftpTreeRafPending) return
    sftpTreeRafPending = true
    requestAnimationFrame(() => {
      sftpTreeRafPending = false
      sftpTreeScrollTop.value = scrollTop
      sftpTreeViewportHeight.value = height
    })
  }

  // Breadcrumbs
  function getBreadcrumbs(currentPath: string) {
    const parts = currentPath.split('/').filter(Boolean)
    const breadcrumbs = [{ label: '/', path: '/' }]
    let built = ''
    parts.forEach((part) => {
      built += `/${part}`
      breadcrumbs.push({ label: part, path: built })
    })
    return breadcrumbs
  }

  // Ensure SFTP is loaded for active session
  async function ensureActiveSftpLoaded(hasActiveSession: boolean) {
    if (!hasActiveSession || !getSftpConnection().host) {
      sftpFiles.value = []
      sftpStatus.value = 'Please connect a session first'
      return
    }

    if (sftpTree.value.length === 0 && !sftpTreeLoading.value) {
      await loadSftpTreeRoot()
      return
    }

    if (sftpFiles.value.length === 0 && sftpTree.value.length > 0) {
      sftpPath.value = '/'
      sftpFiles.value = sftpTree.value
    }
  }

  return {
    // State
    sftpTreeLoading,
    sftpTreeScrollTop,
    sftpTreeViewportHeight,
    sftpPathHistory,
    sftpPathHistoryIndex,
    sftpBookmarks,
    // Bookmark operations
    loadBookmarks,
    addBookmark,
    removeBookmark,
    // Navigation
    pushSftpPath,
    navigateSftpBack,
    navigateSftpForward,
    // File operations
    normalizeSftpFile,
    loadSftpFiles,
    findSftpTreeNode,
    refreshSftpTreePath,
    loadSftpTreeRoot,
    toggleSftpTreeNode,
    openSftpPath,
    openSftpItem,
    // Sorting
    setSftpSort,
    sftpSortLabel,
    // Virtual scrolling
    updateSftpTreeViewport,
    // Breadcrumbs
    getBreadcrumbs,
    // Session management
    ensureActiveSftpLoaded,
  }
}
