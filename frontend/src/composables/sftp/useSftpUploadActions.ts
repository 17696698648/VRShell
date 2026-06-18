import {open} from '@tauri-apps/plugin-dialog'
import type {Ref, WritableComputedRef} from 'vue'
import {
  formatSftpError,
  uploadSftpFiles,
  uploadSftpLocalPaths,
  type SftpConnection,
} from '../../services/sftp'
import type {DroppedUploadFile} from '../../types'
import {joinRemotePath} from '../../utils/sftp'

export function useSftpUploadActions(options: {
  sftpStatus: WritableComputedRef<string>
  pendingUploadDirectory: Ref<string>
  getSftpConnection: () => SftpConnection
  refreshSftpTreePath: (path?: string) => Promise<void>
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
  beginSftpTask: (type: 'upload') => string
  finishSftpTask: () => void
  failSftpTask: (error: unknown) => void
  readFileAsBase64: (file: File) => Promise<string>
}) {
  async function triggerUploadToCurrentPath(targetDirectory: string) {
    options.pendingUploadDirectory.value = targetDirectory
    await uploadLocalPathsFromDialog(options.pendingUploadDirectory.value)
  }

  async function uploadLocalPathsFromDialog(targetDirectory: string) {
    const selected = await open({multiple: true, directory: false})
    const localPaths = Array.isArray(selected) ? selected : selected ? [selected] : []

    if (localPaths.length === 0) {
      options.sftpStatus.value = 'Upload canceled'
      return
    }

    await uploadLocalPaths(localPaths, targetDirectory)
  }

  async function uploadLocalPaths(localPaths: string[], targetDirectory: string) {
    try {
      options.sftpStatus.value = `Uploading ${localPaths.length} files...`
      const files = localPaths.map((localPath) => ({
        localPath,
        remotePath: joinRemotePath(targetDirectory, getLocalPathFileName(localPath)),
      }))
      const taskId = options.beginSftpTask('upload')
      const summary = await uploadSftpLocalPaths(options.getSftpConnection(), files, taskId)
      options.finishSftpTask()
      reportUploadSummary(summary.uploaded, summary.failed.length)
      if (summary.failed.length > 0) console.warn('sftp upload failures:', summary.failed)
      await options.refreshSftpTreePath(targetDirectory)
    } catch (error) {
      options.failSftpTask(error)
      options.sftpStatus.value = `Upload failed: ${formatSftpError(error)}`
      options.showToast('Upload failed', 'error')
    }
  }

  async function uploadLocalFiles(files: (File | DroppedUploadFile)[], targetDirectory: string) {
    try {
      options.sftpStatus.value = `Preparing ${files.length} files...`
      const uploadFiles = []

      for (const item of files) {
        const file = item instanceof File ? item : item.file
        const relativePath = item instanceof File ? file.name : item.relativePath
        options.sftpStatus.value = `Reading ${relativePath}...`
        uploadFiles.push({
          remotePath: joinRemotePath(targetDirectory, relativePath),
          dataBase64: await options.readFileAsBase64(file),
        })
      }

      options.sftpStatus.value = `Uploading ${files.length} files...`
      const taskId = options.beginSftpTask('upload')
      const summary = await uploadSftpFiles(options.getSftpConnection(), uploadFiles, taskId)
      options.finishSftpTask()
      reportUploadSummary(summary.uploaded, summary.failed.length)
      if (summary.failed.length > 0) console.warn('sftp upload failures:', summary.failed)
      await options.refreshSftpTreePath(targetDirectory)
    } catch (error) {
      options.failSftpTask(error)
      options.sftpStatus.value = `Upload failed: ${formatSftpError(error)}`
      options.showToast('Upload failed', 'error')
    }
  }

  function reportUploadSummary(uploaded: number, failedCount: number) {
    options.sftpStatus.value = failedCount > 0
      ? `Uploaded ${uploaded} files, ${failedCount} failed`
      : `Uploaded ${uploaded} files`
    options.showToast(options.sftpStatus.value, failedCount > 0 ? 'error' : 'success')
  }

  return {
    triggerUploadToCurrentPath,
    uploadLocalFiles,
    uploadLocalPaths,
    uploadLocalPathsFromDialog,
  }
}

function getLocalPathFileName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? 'upload.bin'
}
