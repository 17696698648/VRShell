import {ref, type WritableComputedRef} from 'vue'
import {listSftpDirectory, type SftpConnection} from '../services/sftp'
import type {SftpFileItem, SftpTreeNode} from '../types'
import {createSftpTreeNode, getSftpFileIcon} from './useSftpTree'

type RawSftpFile = {
  name: string
  path: string
  size: string
  sizeBytes?: number
  modified?: number
  isDirectory?: boolean
  isSymlink?: boolean
}

export function useSftpTreeLoader(options: {
  sftpPath: WritableComputedRef<string>
  sftpFiles: WritableComputedRef<SftpFileItem[]>
  sftpTree: WritableComputedRef<SftpTreeNode[]>
  sftpStatus: WritableComputedRef<string>
  hasActiveSession: () => boolean
  getSftpConnection: () => SftpConnection
  openSftpFile: (file: SftpFileItem) => void
  pushSftpPath: (path: string) => void
}) {
  const sftpTreeLoading = ref(false)

  function normalizeSftpFile(file: RawSftpFile): SftpFileItem {
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

  async function loadSftpFiles(path = options.sftpPath.value) {
    if (!options.hasActiveSession()) {
      return []
    }

    options.sftpStatus.value = 'Loading...'

    try {
      const files = await listSftpDirectory(options.getSftpConnection(), path)
      const normalizedFiles = files.map(normalizeSftpFile)

      if (path === options.sftpPath.value) {
        options.sftpFiles.value = normalizedFiles
        options.sftpStatus.value = files.length === 0 ? 'Directory is empty' : ''
      }

      return normalizedFiles
    } catch (error) {
      if (path === options.sftpPath.value) {
        options.sftpFiles.value = []
        options.sftpStatus.value = `SFTP failed: ${String(error)}`
      }
      throw error
    }
  }

  function findSftpTreeNode(path: string, nodes = options.sftpTree.value): SftpTreeNode | null {
    for (const node of nodes) {
      if (node.path === path) {
        return node
      }

      const child = findSftpTreeNode(path, node.children)
      if (child) {
        return child
      }
    }

    return null
  }

  async function refreshSftpTreePath(path = options.sftpPath.value) {
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
    if (options.sftpTree.value.length > 0 && !force) {
      options.sftpPath.value = '/'
      options.sftpFiles.value = options.sftpTree.value
      return
    }

    sftpTreeLoading.value = true
    try {
      const rootFiles = await loadSftpFiles('/')
      options.sftpTree.value = rootFiles.map((file) => createSftpTreeNode(file, 0))
      options.sftpPath.value = '/'
      options.sftpFiles.value = rootFiles
      options.sftpStatus.value = rootFiles.length === 0 ? 'Directory is empty' : ''
    } catch (error) {
      options.sftpTree.value = []
      options.sftpFiles.value = []
      options.sftpStatus.value = `SFTP failed: ${String(error)}`
    } finally {
      sftpTreeLoading.value = false
    }
  }

  async function toggleSftpTreeNode(node: SftpTreeNode) {
    if (!node.isDirectory) {
      options.openSftpFile(node)
      return
    }

    options.sftpPath.value = node.path

    if (node.expanded) {
      node.expanded = false
      options.sftpFiles.value = node.children
      return
    }

    node.expanded = true

    if (node.loaded) {
      options.sftpFiles.value = node.children
      return
    }

    node.loading = true
    try {
      const children = await loadSftpFiles(node.path)
      node.children = children.map((file) => createSftpTreeNode(file, node.depth + 1))
      node.loaded = true
      options.sftpStatus.value = children.length === 0 ? 'Directory is empty' : ''
    } catch (error) {
      node.expanded = false
      options.sftpStatus.value = `SFTP failed: ${String(error)}`
    } finally {
      node.loading = false
    }
  }

  async function openSftpPath(path: string, optionsOverride: { recordHistory?: boolean } = {}) {
    options.sftpPath.value = path
    if (optionsOverride.recordHistory !== false) {
      options.pushSftpPath(path)
    }
    if (path === '/') {
      await loadSftpTreeRoot()
      return
    }

    const node = findSftpTreeNode(path)
    if (!node) {
      return
    }

    if (!node.expanded) {
      await toggleSftpTreeNode(node)
      return
    }

    options.sftpFiles.value = node.children
  }

  return {
    findSftpTreeNode,
    loadSftpFiles,
    loadSftpTreeRoot,
    normalizeSftpFile,
    openSftpPath,
    refreshSftpTreePath,
    sftpTreeLoading,
    toggleSftpTreeNode,
  }
}
