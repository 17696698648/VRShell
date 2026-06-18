import {save} from '@tauri-apps/plugin-dialog'
import type {WritableComputedRef} from 'vue'
import {
  downloadSftpFileToPath,
  type SftpConnection,
} from '../../services/sftp'
import type {SftpFileItem} from '../../types'

export function useSftpDownloadActions(options: {
  sftpStatus: WritableComputedRef<string>
  getSftpConnection: () => SftpConnection
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
  beginSftpTask: (type: 'download') => string
  finishSftpTask: () => void
  failSftpTask: (error: unknown) => void
}) {
  async function downloadSftpFile(file: SftpFileItem) {
    const localPath = await save({defaultPath: file.name})

    if (!localPath) {
      options.sftpStatus.value = 'Download canceled'
      return
    }

    try {
      options.sftpStatus.value = `Downloading ${file.name}...`
      const taskId = options.beginSftpTask('download')
      await downloadSftpFileToPath(options.getSftpConnection(), file.path, localPath, taskId)
      options.finishSftpTask()
      options.sftpStatus.value = `Downloaded ${file.name}`
      options.showToast(`Downloaded ${file.name}`, 'success')
    } catch (error) {
      options.failSftpTask(error)
      throw error
    }
  }

  return {
    downloadSftpFile,
  }
}
