import type {ComputedRef} from 'vue'
import type {SftpFileItem, SftpTreeNode} from '../types'
import {parentRemotePath} from '../utils/sftp'

export function useSftpItemOpen(options: {
  sftpPath: ComputedRef<string>
  visibleSftpTreeNodes: ComputedRef<SftpTreeNode[]>
  findSftpTreeNode: (path: string) => SftpTreeNode | null
  openSftpFile: (file: SftpFileItem) => void
  openSftpPath: (path: string) => void
  toggleSftpTreeNode: (node: SftpTreeNode) => void | Promise<void>
}) {
  function openSftpDirectory(name: string) {
    if (name === '..') {
      options.openSftpPath(parentRemotePath(options.sftpPath.value))
      return
    }

    const file = options.visibleSftpTreeNodes.value.find((item) => item.name === name && item.isDirectory)
    if (file) {
      options.toggleSftpTreeNode(file)
    }
  }

  function openSftpItem(file: SftpFileItem) {
    if (file.isDirectory) {
      const node = options.findSftpTreeNode(file.path)
      if (node) {
        options.toggleSftpTreeNode(node)
      }
      return
    }

    options.openSftpFile(file)
  }

  return {
    openSftpDirectory,
    openSftpItem,
  }
}
