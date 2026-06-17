import {
  createSftpDirectory,
  createSftpFile,
  renameSftpItem,
  type SftpConnection,
} from '../services/sftp'
import type {SftpFileItem} from '../types'
import {joinRemotePath, parentRemotePath} from '../utils/sftp'

export interface AskPrompt {
  (options: { title: string; message?: string; placeholder?: string; defaultValue?: string; inputType?: 'text' | 'password' }): Promise<string | null>
}

export function useSftpCreateRenameActions(options: {
  getSftpConnection: () => SftpConnection
  refreshSftpTreePath: (path?: string) => Promise<void>
  askPrompt: AskPrompt
}) {
  async function createSftpFileAt(targetPath: string) {
    const fileName = await options.askPrompt({
      title: 'New file',
      placeholder: 'e.g. readme.txt',
      defaultValue: 'new-file.txt',
    })
    if (!fileName) return

    await createSftpFile(options.getSftpConnection(), joinRemotePath(targetPath, fileName))
    await options.refreshSftpTreePath(targetPath)
  }

  async function createSftpFolderAt(targetPath: string) {
    const folderName = await options.askPrompt({
      title: 'New folder',
      placeholder: 'e.g. src',
      defaultValue: 'new-folder',
    })
    if (!folderName) return

    await createSftpDirectory(options.getSftpConnection(), joinRemotePath(targetPath, folderName))
    await options.refreshSftpTreePath(targetPath)
  }

  async function renameSftpTarget(targetPath: string, targetFile?: SftpFileItem | null) {
    const currentName = targetFile?.name ?? targetPath.split('/').filter(Boolean).at(-1) ?? ''
    const nextName = await options.askPrompt({
      title: 'Rename',
      message: `Current name: ${currentName}`,
      placeholder: 'Enter new name',
      defaultValue: currentName,
    })
    if (!nextName || nextName === currentName) return

    const parentPath = parentRemotePath(targetPath)
    await renameSftpItem(options.getSftpConnection(), targetPath, joinRemotePath(parentPath, nextName))
    await options.refreshSftpTreePath(parentPath)
  }

  return {
    createSftpFileAt,
    createSftpFolderAt,
    renameSftpTarget,
  }
}
