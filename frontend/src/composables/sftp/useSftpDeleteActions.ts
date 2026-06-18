import type {WritableComputedRef} from 'vue'
import type {ContextMenuScope} from '../../menuTypes'
import {
  deleteSftpDirectoryRecursive,
  deleteSftpItem,
  type SftpConnection,
} from '../../services/sftp'
import type {SftpFileItem} from '../../types'
import {parentRemotePath} from '../../utils/sftp'

export interface AskConfirm {
  (title: string, message: string): Promise<boolean>
}

export interface AskPrompt {
  (options: { title: string; message?: string; placeholder?: string; defaultValue?: string; inputType?: 'text' | 'password' }): Promise<string | null>
}

export function useSftpDeleteActions(options: {
  sftpStatus: WritableComputedRef<string>
  editorTabs: WritableComputedRef<{ path: string }[]>
  getSftpConnection: () => SftpConnection
  refreshSftpTreePath: (path?: string) => Promise<void>
  askConfirm: AskConfirm
  askPrompt: AskPrompt
  beginSftpTask: (type: 'delete') => string
  finishSftpTask: () => void
  failSftpTask: (error: unknown) => void
}) {
  async function deleteSftpTarget(targetType: ContextMenuScope, targetPath: string, targetFile: SftpFileItem | null | undefined, recursive: boolean) {
    const isDirectory = targetType === 'sftp-directory'
    const itemName = targetFile?.name ?? targetPath

    if (recursive) {
      const confirmed = await options.askConfirm(
        'Recursively delete directory',
        `This will permanently delete ${itemName} and every file/folder inside it. This cannot be undone. Continue?`,
      )
      if (!confirmed) return

      const typedName = await options.askPrompt({
        title: 'Confirm recursive delete',
        message: `Type "${itemName}" to confirm deletion`,
        placeholder: itemName,
      })
      if (typedName !== itemName) {
        options.sftpStatus.value = 'Recursive delete canceled 鈥?name did not match'
        return
      }
      try {
        const taskId = options.beginSftpTask('delete')
        await deleteSftpDirectoryRecursive(options.getSftpConnection(), targetPath, taskId)
        options.finishSftpTask()
      } catch (error) {
        options.failSftpTask(error)
        throw error
      }
    } else {
      const confirmed = await options.askConfirm(
        isDirectory ? 'Delete empty directory' : 'Delete remote file',
        isDirectory
          ? `Delete empty directory ${itemName}? If it contains files, use Delete recursively instead.`
          : `Delete remote file ${itemName}?`,
      )
      if (!confirmed) return

      try {
        await deleteSftpItem(options.getSftpConnection(), targetPath, isDirectory)
      } catch (error) {
        options.failSftpTask(error)
        throw error
      }
    }

    options.editorTabs.value = options.editorTabs.value.filter((file) => file.path !== targetPath && !file.path.startsWith(`${targetPath}/`))
    await options.refreshSftpTreePath(parentRemotePath(targetPath))
  }

  return {
    deleteSftpTarget,
  }
}
