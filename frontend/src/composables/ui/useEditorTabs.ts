import type { ComputedRef, Ref, WritableComputedRef } from 'vue'
import { MAX_EDITABLE_FILE_SIZE } from '../../constants'
import { downloadSftpFile, formatSftpError, uploadSftpFile, type SftpConnection } from '../../services/sftp'
import type { EditorFile, SftpFileItem } from '../../types'
import { detectFileLanguage, isLikelyBinaryFile } from '../../utils/sftp'

type UseEditorTabsOptions = {
  editorTabs: WritableComputedRef<EditorFile[]>
  activeEditorFile: ComputedRef<EditorFile | null>
  showEditorArea: WritableComputedRef<boolean>
  sftpFiles: WritableComputedRef<SftpFileItem[]>
  sftpStatus: WritableComputedRef<string>
  hasActiveSession: () => boolean
  getSftpConnection: () => SftpConnection
  findSftpTreeNode: (path: string) => SftpFileItem | null | undefined
  askConfirm: (title: string, message: string) => Promise<boolean>
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
  beginSftpTask: (type: 'upload' | 'download' | 'delete', retryAction?: () => Promise<void>, retryLabel?: string) => string
  finishSftpTask: () => void
  failSftpTask: (error: unknown) => void
  refreshSftpTreePath?: (path: string) => Promise<void>
}

export function useEditorTabs(options: UseEditorTabsOptions) {
  const {
    editorTabs,
    activeEditorFile,
    showEditorArea,
    sftpFiles,
    sftpStatus,
    hasActiveSession,
    getSftpConnection,
    findSftpTreeNode,
    askConfirm,
    showToast,
    beginSftpTask,
    finishSftpTask,
    failSftpTask,
    refreshSftpTreePath,
  } = options

  function selectEditorFile(path: string) {
    editorTabs.value.forEach((file) => {
      file.selected = file.path === path
    })
  }

  async function openSftpFile(file: SftpFileItem) {
    if (!hasActiveSession()) {
      return
    }

    if (file.sizeBytes > MAX_EDITABLE_FILE_SIZE) {
      sftpStatus.value = `${file.name} is too large to edit directly`
      showToast('File is too large to edit directly', 'error')
      return
    }

    if (isLikelyBinaryFile(file.name)) {
      sftpStatus.value = `${file.name} looks like a binary file`
      showToast('Binary files cannot be edited directly', 'error')
      return
    }

    sftpStatus.value = `Opening ${file.name}...`

    try {
      const taskId = beginSftpTask('download')
      const dataBase64 = await downloadSftpFile(getSftpConnection(), file.path, taskId)
      finishSftpTask()
      const content = decodeBase64Text(dataBase64)
      const existingTab = editorTabs.value.find((tab) => tab.path === file.path)

      editorTabs.value.forEach((tab) => {
        tab.selected = false
      })

      if (existingTab) {
        existingTab.content = content
        existingTab.selected = true
      } else {
        editorTabs.value.push({
          name: file.name,
          path: file.path,
          content,
          language: detectFileLanguage(file.name),
          selected: true,
          dirty: false,
          remoteModified: file.modified,
          remoteSizeBytes: file.sizeBytes,
        })
      }

      showEditorArea.value = true
      sftpStatus.value = ''
    } catch (error) {
      failSftpTask(error)
      showEditorArea.value = true
      sftpStatus.value = `Open failed: ${formatSftpError(error)}`
      showToast('Open failed', 'error')
      console.error('open sftp file failed:', error)
    }
  }

  async function closeEditorTab(path: string) {
    const closedIndex = editorTabs.value.findIndex((file) => file.path === path)

    if (closedIndex < 0) {
      return
    }

    const closingFile = editorTabs.value[closedIndex]

    if (closingFile.dirty) {
      const confirmed = await askConfirm('Close unsaved file', `${closingFile.name} has unsaved changes. Close it?`)
      if (!confirmed) {
        return
      }
    }

    const wasSelected = closingFile.selected
    editorTabs.value.splice(closedIndex, 1)

    if (editorTabs.value.length === 0) {
      showEditorArea.value = false
      return
    }

    if (wasSelected) {
      const nextIndex = Math.min(closedIndex, editorTabs.value.length - 1)
      editorTabs.value.forEach((file, index) => {
        file.selected = index === nextIndex
      })
    }
  }

  function markActiveEditorDirty() {
    if (activeEditorFile.value) {
      activeEditorFile.value.dirty = true
    }
  }

  async function applyEditorTabAction(filePath: string, action: string) {
    if (action === 'save_file') {
      selectEditorFile(filePath)
      await saveActiveEditorFile()
      return
    }

    if (action === 'save_all_files' || action === 'save_dirty_files') {
      await saveAllEditorFiles()
      return
    }

    if (action === 'close_file') {
      await closeEditorTab(filePath)
      return
    }

    if (action === 'close_other_files') {
      await closeOtherEditorTabs(filePath)
      return
    }

    if (action === 'close_left_files') {
      await closeEditorTabsBeside(filePath, 'left')
      return
    }

    if (action === 'close_right_files') {
      await closeEditorTabsBeside(filePath, 'right')
      return
    }

    if (action === 'close_saved_files') {
      closeSavedEditorTabs(filePath)
      return
    }

    if (action === 'close_all_files') {
      await closeAllEditorTabs()
    }
  }

  async function saveAllEditorFiles() {
    const dirtyFiles = editorTabs.value.filter((file) => file.dirty)

    for (const file of dirtyFiles) {
      await saveEditorFile(file)
    }

    if (dirtyFiles.length > 0) {
      showToast(`Saved ${dirtyFiles.length} files`, 'success')
    }
  }

  async function closeOtherEditorTabs(filePath: string) {
    const dirtyFiles = editorTabs.value.filter((file) => file.path !== filePath && file.dirty)

    if (dirtyFiles.length > 0) {
      const confirmed = await askConfirm('Close other files', `${dirtyFiles.length} unsaved files will be closed. Continue?`)
      if (!confirmed) {
        return
      }
    }

    editorTabs.value = editorTabs.value.filter((file) => file.path === filePath)
    selectEditorFile(filePath)
  }

  async function closeEditorTabsBeside(filePath: string, side: 'left' | 'right') {
    const targetIndex = editorTabs.value.findIndex((file) => file.path === filePath)

    if (targetIndex < 0) {
      return
    }

    const closingFiles = editorTabs.value.filter((_, index) => (side === 'left' ? index < targetIndex : index > targetIndex))
    const dirtyFiles = closingFiles.filter((file) => file.dirty)

    if (dirtyFiles.length > 0) {
      const confirmed = await askConfirm(side === 'left' ? 'Close left files' : 'Close right files', `${dirtyFiles.length} unsaved files will be closed. Continue?`)
      if (!confirmed) {
        return
      }
    }

    const closingPaths = new Set(closingFiles.map((file) => file.path))
    editorTabs.value = editorTabs.value.filter((file) => !closingPaths.has(file.path))
    selectEditorFile(filePath)
  }

  function closeSavedEditorTabs(filePath: string) {
    const activePath = activeEditorFile.value?.path ?? filePath
    editorTabs.value = editorTabs.value.filter((file) => file.dirty || file.path === filePath)

    if (editorTabs.value.length === 0) {
      showEditorArea.value = false
      return
    }

    if (editorTabs.value.some((file) => file.path === activePath)) {
      selectEditorFile(activePath)
    } else {
      editorTabs.value.forEach((file, index) => {
        file.selected = index === 0
      })
    }
  }

  async function closeAllEditorTabs() {
    const dirtyFiles = editorTabs.value.filter((file) => file.dirty)

    if (dirtyFiles.length > 0) {
      const confirmed = await askConfirm('Close all files', `${dirtyFiles.length} unsaved files will be closed. Continue?`)
      if (!confirmed) {
        return
      }
    }

    editorTabs.value = []
    showEditorArea.value = false
  }

  async function saveEditorFile(file: EditorFile) {
    if (!hasActiveSession()) {
      return
    }

    const canSave = await confirmRemoteFileUnchanged(file)
    if (!canSave) {
      return
    }

    try {
      const taskId = beginSftpTask('upload')
      await uploadSftpFile(getSftpConnection(), file.path, encodeTextBase64(file.content), taskId)
      finishSftpTask()
      file.dirty = false
      updateEditorFileRemoteMeta(file)
      sftpStatus.value = `Saved ${file.name}`
      refreshSftpTreePath?.(file.path)
    } catch (error) {
      failSftpTask(error)
      throw error
    }
  }

  async function saveActiveEditorFile() {
    if (!activeEditorFile.value || !hasActiveSession()) {
      return
    }

    const file = activeEditorFile.value
    sftpStatus.value = `Saving ${file.name}...`

    try {
      const canSave = await confirmRemoteFileUnchanged(file)
      if (!canSave) {
        sftpStatus.value = 'Save canceled'
        return
      }

      const taskId = beginSftpTask('upload')
      await uploadSftpFile(getSftpConnection(), file.path, encodeTextBase64(file.content), taskId)
      finishSftpTask()
      file.dirty = false
      updateEditorFileRemoteMeta(file)
      sftpStatus.value = `Saved ${file.name}`
      refreshSftpTreePath?.(file.path)
      showToast(`Saved ${file.name}`, 'success')
    } catch (error) {
      failSftpTask(error)
      sftpStatus.value = `Save failed: ${formatSftpError(error)}`
      showToast('Save failed', 'error')
    }
  }

  async function confirmRemoteFileUnchanged(file: EditorFile) {
    const remoteFile = findSftpTreeNode(file.path) ?? sftpFiles.value.find((item) => item.path === file.path)
    if (!remoteFile) {
      return true
    }

    const changed = remoteFile.modified !== file.remoteModified || remoteFile.sizeBytes !== file.remoteSizeBytes
    if (!changed) {
      return true
    }

    return askConfirm('Remote file changed', `${file.name} changed on the remote side after you opened it. Overwrite it?`)
  }

  function updateEditorFileRemoteMeta(file: EditorFile) {
    const remoteFile = findSftpTreeNode(file.path) ?? sftpFiles.value.find((item) => item.path === file.path)
    file.remoteModified = remoteFile?.modified ?? Date.now() / 1000
    file.remoteSizeBytes = new Blob([file.content]).size
  }

  return {
    selectEditorFile,
    openSftpFile,
    closeEditorTab,
    markActiveEditorDirty,
    applyEditorTabAction,
    saveAllEditorFiles,
    saveEditorFile,
    saveActiveEditorFile,
    confirmRemoteFileUnchanged,
  }
}

function decodeBase64Text(dataBase64: string) {
  const bytes = Uint8Array.from(atob(dataBase64), (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeTextBase64(content: string) {
  const bytes = new TextEncoder().encode(content)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}
