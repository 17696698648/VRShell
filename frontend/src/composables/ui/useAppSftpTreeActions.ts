import type { ComputedRef, Ref, WritableComputedRef } from 'vue'
import type { SessionHost } from '../../components/SessionTreeGroup.vue'
import type { SftpFileItem, SftpTreeNode } from '../../types'

export function useAppSftpTreeActions({
  activeSession,
  findSftpTreeNodeState,
  loadSftpTreeRoot,
  openSftpPathState,
  refreshSftpTreePathState,
  sftpFiles,
  sftpPath,
  sftpStatus,
  sftpTree,
  sftpTreeLoading,
}: {
  activeSession: ComputedRef<SessionHost | undefined>
  findSftpTreeNodeState: (path: string, nodes?: SftpTreeNode[]) => SftpTreeNode | null
  loadSftpTreeRoot: () => Promise<void>
  openSftpPathState: (path: string, options?: { recordHistory?: boolean }) => Promise<void>
  refreshSftpTreePathState: (path?: string) => Promise<void>
  sftpFiles: WritableComputedRef<SftpFileItem[]>
  sftpPath: WritableComputedRef<string>
  sftpStatus: WritableComputedRef<string>
  sftpTree: WritableComputedRef<SftpTreeNode[]>
  sftpTreeLoading: Ref<boolean>
}) {
  async function ensureActiveSftpLoaded() {
    if (!activeSession.value) {
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

  function findSftpTreeNode(path: string, nodes?: SftpTreeNode[]) {
    return findSftpTreeNodeState(path, nodes)
  }

  function refreshSftpTreePath(path = sftpPath.value) {
    return refreshSftpTreePathState(path)
  }

  function openSftpPath(path: string, options: { recordHistory?: boolean } = {}) {
    return openSftpPathState(path, options)
  }

  return {
    ensureActiveSftpLoaded,
    findSftpTreeNode,
    openSftpPath,
    refreshSftpTreePath,
  }
}
