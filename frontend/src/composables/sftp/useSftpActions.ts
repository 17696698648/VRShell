import type {Ref, WritableComputedRef} from 'vue'
import type {ContextMenuScope, SftpAction} from '../../menuTypes'
import type {SftpConnection} from '../../services/sftp'
import type {SftpFileItem, SftpTreeNode} from '../../types'
import {parentRemotePath} from '../../utils/sftp'
import {useSftpClipboardActions} from './useSftpClipboardActions'
import {useSftpCreateRenameActions} from './useSftpCreateRenameActions'
import {useSftpDeleteActions} from './useSftpDeleteActions'
import {useSftpDownloadActions} from './useSftpDownloadActions'
import {useSftpRemoteSearch} from './useSftpRemoteSearch'
import {useSftpUploadActions} from './useSftpUploadActions'

type UseSftpActionsOptions = {
  state: {
    sftpSearchText: WritableComputedRef<string>
    sftpStatus: WritableComputedRef<string>
    sftpRemoteSearching: Ref<boolean>
    sftpCancelRemoteSearch: Ref<boolean>
    sftpSearchResultMode: Ref<boolean>
    sftpTreeScrollTop: Ref<number>
    sftpPath: WritableComputedRef<string>
    sftpFiles: WritableComputedRef<SftpFileItem[]>
    sftpTree: WritableComputedRef<SftpTreeNode[]>
    pendingUploadDirectory: Ref<string>
    editorTabs: WritableComputedRef<{ path: string }[]>
  }
  tree: {
    loadSftpTreeRoot: () => Promise<void>
    loadSftpFiles: (path: string) => Promise<SftpFileItem[]>
    createSftpTreeNode: (file: SftpFileItem, depth: number) => SftpTreeNode
    findSftpTreeNode: (path: string) => SftpTreeNode | null | undefined
    refreshSftpTreePath: (path?: string) => Promise<void>
    collapseSftpTree: (nodes: SftpTreeNode[]) => void
  }
  io: {
    getSftpConnection: () => SftpConnection
    openSftpFile: (file: SftpFileItem) => Promise<void>
    copyText: (value: string) => Promise<void>
    readFileAsBase64: (file: File) => Promise<string>
  }
  feedback: {
    askConfirm: (title: string, message: string) => Promise<boolean>
    askPrompt: (options: { title: string; message?: string; placeholder?: string; defaultValue?: string; inputType?: 'text' | 'password' }) => Promise<string | null>
    showToast: (message: string, type?: 'info' | 'success' | 'error') => void
  }
  task: {
    beginSftpTask: (type: 'upload' | 'download' | 'delete', retryAction?: () => Promise<void>, retryLabel?: string) => string
    finishSftpTask: () => void
    failSftpTask: (error: unknown) => void
  }
}

export function useSftpActions(options: UseSftpActionsOptions) {
  const {
    sftpSearchText,
    sftpStatus,
    sftpRemoteSearching,
    sftpCancelRemoteSearch,
    sftpSearchResultMode,
    sftpTreeScrollTop,
    sftpPath,
    sftpFiles,
    sftpTree,
    pendingUploadDirectory,
    editorTabs,
  } = options.state
  const {
    loadSftpTreeRoot,
    loadSftpFiles,
    createSftpTreeNode,
    findSftpTreeNode,
    refreshSftpTreePath,
    collapseSftpTree,
  } = options.tree
  const {
    getSftpConnection,
    openSftpFile,
    copyText,
    readFileAsBase64,
  } = options.io
  const {
    askConfirm,
    askPrompt,
    showToast,
  } = options.feedback
  const {
    beginSftpTask,
    finishSftpTask,
    failSftpTask,
  } = options.task

  const {
    cancelRemoteSearch,
    clearSftpSearchResults,
    remoteSearchSftpTree,
  } = useSftpRemoteSearch({
    sftpSearchText,
    sftpStatus,
    sftpRemoteSearching,
    sftpCancelRemoteSearch,
    sftpSearchResultMode,
    sftpTreeScrollTop,
    sftpTree,
    loadSftpTreeRoot,
    loadSftpFiles,
    createSftpTreeNode,
    showToast,
  })
  const {
    triggerUploadToCurrentPath: triggerUploadToDirectory,
    uploadLocalFiles,
    uploadLocalPaths,
    uploadLocalPathsFromDialog,
  } = useSftpUploadActions({
    sftpStatus,
    pendingUploadDirectory,
    getSftpConnection,
    refreshSftpTreePath,
    showToast,
    beginSftpTask,
    finishSftpTask,
    failSftpTask,
    readFileAsBase64,
  })
  const {downloadSftpFile} = useSftpDownloadActions({
    sftpStatus,
    getSftpConnection,
    showToast,
    beginSftpTask,
    finishSftpTask,
    failSftpTask,
  })
  const {deleteSftpTarget} = useSftpDeleteActions({
    sftpStatus,
    editorTabs,
    getSftpConnection,
    refreshSftpTreePath,
    askConfirm,
    askPrompt,
    beginSftpTask,
    finishSftpTask,
    failSftpTask,
  })
  const {
    createSftpFileAt,
    createSftpFolderAt,
    renameSftpTarget,
  } = useSftpCreateRenameActions({
    getSftpConnection,
    refreshSftpTreePath,
    askPrompt,
  })
  const {
    copySftpCdCommand,
    copySftpName,
    copySftpPath,
  } = useSftpClipboardActions({
    sftpStatus,
    copyText,
    showToast,
  })

  async function triggerUploadToCurrentPath() {
    await triggerUploadToDirectory(sftpPath.value)
  }

  async function applySftpAction(targetType: ContextMenuScope, targetPath: string, action: SftpAction) {
    const targetFile = findSftpTreeNode(targetPath) ?? sftpFiles.value.find((file) => file.path === targetPath)

    if (action === 'edit' && targetFile && !targetFile.isDirectory) {
      await openSftpFile(targetFile)
      return
    }

    if (action === 'upload') {
      pendingUploadDirectory.value = targetType === 'sftp-directory' ? targetPath : sftpPath.value
      await uploadLocalPathsFromDialog(pendingUploadDirectory.value)
      return
    }

    if (action === 'download' && targetFile && !targetFile.isDirectory) {
      await downloadSftpFile(targetFile)
      return
    }

    if (action === 'refresh_directory') {
      await refreshSftpTreePath(targetType === 'sftp-directory' ? targetPath : parentRemotePath(targetPath))
      return
    }

    if (action === 'collapse_all') {
      collapseSftpTree(sftpTree.value)
      sftpPath.value = '/'
      sftpFiles.value = sftpTree.value
      return
    }

    if (action === 'open_parent') {
      sftpPath.value = parentRemotePath(targetPath)
      await refreshSftpTreePath(sftpPath.value)
      return
    }

    if (action === 'copy_path') {
      await copySftpPath(targetPath)
      return
    }

    if (action === 'copy_name') {
      await copySftpName(targetPath, targetFile)
      return
    }

    if (action === 'copy_cd_command') {
      await copySftpCdCommand(targetPath)
      return
    }

    if (action === 'create_file') {
      await createSftpFileAt(targetPath)
      return
    }

    if (action === 'create_folder') {
      await createSftpFolderAt(targetPath)
      return
    }

    if (action === 'rename') {
      await renameSftpTarget(targetPath, targetFile)
      return
    }

    if (action === 'delete' || action === 'delete_recursive') {
      await deleteSftpTarget(targetType, targetPath, targetFile, action === 'delete_recursive')
    }
  }

  return {
    remoteSearchSftpTree,
    cancelRemoteSearch,
    clearSftpSearchResults,
    triggerUploadToCurrentPath,
    applySftpAction,
    downloadSftpFile,
    uploadLocalPathsFromDialog,
    uploadLocalPaths,
    uploadLocalFiles,
  }
}
