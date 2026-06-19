import {save} from '@tauri-apps/plugin-dialog'
import type {WritableComputedRef} from 'vue'
import {
  downloadSftpFileToPath,
  type SftpConnection,
} from '../../services/sftp'
import {summarizeAppError} from '../../services/errors'
import type {SftpFileItem} from '../../types'

export function useSftpDownloadActions(options: {
  sftpStatus: WritableComputedRef<string>
  getSftpConnection: () => SftpConnection
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
  beginSftpTask: (type: 'download', retryAction?: () => Promise<void>, retryLabel?: string) => string
  finishSftpTask: () => void
  failSftpTask: (error: unknown) => void
}) {
  async function downloadSftpFile(file: SftpFileItem) {
    const localPath = await save({defaultPath: file.name})

    if (!localPath) {
      options.sftpStatus.value = 'Download canceled'
      return
    }

    await downloadSftpFileToLocalPath(file, localPath)
  }

  async function downloadSftpFileToLocalPath(file: SftpFileItem, localPath: string) {
    try {
      options.sftpStatus.value = `Downloading ${file.name}...`
      const taskId = options.beginSftpTask(
        'download',
        () => downloadSftpFileToLocalPath(file, localPath),
        `Retry download ${file.name}`,
      )
      await downloadSftpFileToPath(options.getSftpConnection(), file.path, localPath, taskId)
      options.finishSftpTask()
      options.sftpStatus.value = `Downloaded ${file.name}`
      options.showToast(`Downloaded ${file.name}`, 'success')
    } catch (error) {
      options.failSftpTask(error)
      options.sftpStatus.value = `Download failed: ${summarizeAppError(error, 'Download failed')}`
      options.showToast(summarizeAppError(error, 'Download failed'), 'error')
      throw error
    }
  }

  return {
    downloadSftpFile,
  }
}
