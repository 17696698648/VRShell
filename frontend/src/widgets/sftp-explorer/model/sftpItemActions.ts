import type {SftpItem} from '../../../entities/sftp'
import {
  createRemoteDirectory,
  createRemoteFile,
  deleteRemoteItem,
  downloadRemoteItem,
  openRemoteFileInSessionEditor,
  renameRemoteItem,
  uploadFileToRemoteDirectory,
  uploadFolderToRemoteDirectory,
} from '../../../features/sftp/manage-files/manageSftpFiles'
import {messages} from '../../../shared/copy'
import {requestConfirm, requestPrompt} from '../../../shared/dialog'
import type {ContextMenuItem} from '../../../shared/context-menu'

export interface SftpItemActionOptions {
  afterCreate?: (parentPath: string, item: SftpItem) => void
  afterDelete?: (parentPath: string, item: SftpItem) => void
  afterRename?: (parentPath: string, oldItem: SftpItem, item: SftpItem) => void
  afterUpdate?: (parentPath: string) => void
  getParentPath?: (item: SftpItem) => string
  openDirectory?: (path: string) => void | Promise<void>
}

export function createSftpItemMenu(item: SftpItem, options: SftpItemActionOptions = {}): ContextMenuItem[] {
  return item.type === 'directory' ? createDirectoryMenu(item, options) : createFileMenu(item, options)
}

export function createSftpDirectoryMenu(parentPath: string, options: SftpItemActionOptions = {}): ContextMenuItem[] {
  return [
    {id: 'mkdir', label: messages.sftp.contextMenu.newFolder, run: () => createDirectory(parentPath, options)},
    {id: 'create-file', label: messages.sftp.contextMenu.newFile, run: () => createFile(parentPath, options)},
    {id: 'upload-file', label: messages.sftp.contextMenu.uploadFile, run: () => uploadFile(parentPath, options)},
    {id: 'upload-folder', label: messages.sftp.contextMenu.uploadFolder, run: () => uploadFolder(parentPath, options)},
  ]
}

export async function openSftpItem(item: SftpItem, options: SftpItemActionOptions = {}) {
  if (item.type === 'directory') {
    await options.openDirectory?.(item.path)
    return
  }
  await openRemoteFileInSessionEditor(item)
}

export async function renameSftpItem(item: SftpItem, options: SftpItemActionOptions = {}) {
  const name = await requestPrompt({
    title: messages.sftp.dialogs.renameRemoteItemTitle,
    label: messages.sftp.dialogs.name,
    value: item.name,
    confirmLabel: messages.sftp.dialogs.rename
  })
  if (!name) return
  const parentPath = getParentPath(item, options)
  const renamed = await renameRemoteItem(item, name)
  if (renamed) options.afterRename?.(parentPath, item, renamed)
  options.afterUpdate?.(parentPath)
}

export async function deleteSftpItem(item: SftpItem, options: SftpItemActionOptions = {}) {
  const confirmed = await requestConfirm({
    title: messages.sftp.dialogs.deleteTitle(item.type),
    message: messages.sftp.dialogs.deleteMessage(item.path),
    confirmLabel: messages.sftp.dialogs.delete,
    tone: 'danger',
  })
  if (!confirmed) return
  const parentPath = getParentPath(item, options)
  await deleteRemoteItem(item)
  options.afterDelete?.(parentPath, item)
  options.afterUpdate?.(parentPath)
}

function createDirectoryMenu(item: SftpItem, options: SftpItemActionOptions): ContextMenuItem[] {
  return [
    {id: 'open', label: messages.sftp.contextMenu.openFolder, run: () => openSftpItem(item, options)},
    ...createSftpDirectoryMenu(item.path, options),
    {id: 'rename', label: messages.sftp.contextMenu.rename, run: () => renameSftpItem(item, options)},
    {id: 'delete', label: messages.sftp.contextMenu.delete, danger: true, run: () => deleteSftpItem(item, options)},
  ]
}

function createFileMenu(item: SftpItem, options: SftpItemActionOptions): ContextMenuItem[] {
  return [
    {id: 'open', label: messages.sftp.contextMenu.openFile, run: () => openSftpItem(item, options)},
    {
      id: 'download', label: messages.sftp.contextMenu.download, run: async () => {
        await downloadRemoteItem(item)
      }
    },
    {id: 'rename', label: messages.sftp.contextMenu.rename, run: () => renameSftpItem(item, options)},
    {id: 'delete', label: messages.sftp.contextMenu.delete, danger: true, run: () => deleteSftpItem(item, options)},
  ]
}

async function createDirectory(parentPath: string, options: SftpItemActionOptions) {
  const name = await requestPrompt({
    title: messages.sftp.dialogs.newRemoteFolderTitle,
    label: messages.sftp.dialogs.folderName,
    confirmLabel: messages.sftp.dialogs.create
  })
  if (!name) return
  const item = await createRemoteDirectory(name, parentPath)
  if (item) options.afterCreate?.(parentPath, item)
  options.afterUpdate?.(parentPath)
}

async function createFile(parentPath: string, options: SftpItemActionOptions) {
  const name = await requestPrompt({
    title: messages.sftp.dialogs.newRemoteFileTitle,
    label: messages.sftp.dialogs.fileName,
    confirmLabel: messages.sftp.dialogs.create
  })
  if (!name) return
  const item = await createRemoteFile(name, parentPath)
  if (item) options.afterCreate?.(parentPath, item)
  options.afterUpdate?.(parentPath)
}

async function uploadFile(parentPath: string, options: SftpItemActionOptions) {
  const item = await uploadFileToRemoteDirectory(parentPath)
  if (item) options.afterCreate?.(parentPath, item)
  options.afterUpdate?.(parentPath)
}

async function uploadFolder(parentPath: string, options: SftpItemActionOptions) {
  const item = await uploadFolderToRemoteDirectory(parentPath)
  if (item) options.afterCreate?.(parentPath, item)
  options.afterUpdate?.(parentPath)
}

function getParentPath(item: SftpItem, options: SftpItemActionOptions) {
  return options.getParentPath?.(item) ?? parentPathFromItem(item)
}

function parentPathFromItem(item: SftpItem) {
  const separatorIndex = item.path.lastIndexOf('/')
  if (separatorIndex <= 0) return '/'
  return item.path.slice(0, separatorIndex)
}
