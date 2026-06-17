import { getCurrentWebview, type DragDropEvent } from '@tauri-apps/api/webview'
import { ref, type Ref } from 'vue'
import type {
  DataTransferItemWithEntry,
  DragFileSystemDirectoryEntry,
  DragFileSystemEntry,
  DragFileSystemFileEntry,
  DroppedUploadFile,
  SftpFileItem,
} from '../types'

export function useSftpDropUpload(
  sftpDrawerElementRef: Ref<HTMLElement | { $el?: HTMLElement } | null>,
  currentPath: Ref<string>,
  uploadLocalPaths: (paths: string[], targetDirectory: string) => Promise<void>,
  uploadLocalFiles: (files: DroppedUploadFile[], targetDirectory: string) => Promise<void>,
) {
  const isSftpDragging = ref(false)
  const pendingDragUploadDirectory = ref('')
  const pendingDragUploadPaths = ref<string[]>([])

  async function registerTauriDragDrop() {
    try {
      await getCurrentWebview().onDragDropEvent((event) => handleTauriDragDropEvent(event.payload))
    } catch (error) {
      console.warn('register tauri drag/drop failed:', error)
    }
  }

  function handleTauriDragDropEvent(event: DragDropEvent) {
    if (event.type === 'leave') {
      isSftpDragging.value = false
      pendingDragUploadPaths.value = []
      pendingDragUploadDirectory.value = ''
      return
    }

    if (!isTauriDropInsideSftp(event)) {
      return
    }

    if (event.type === 'enter') {
      pendingDragUploadPaths.value = event.paths
      isSftpDragging.value = true
      return
    }

    if (event.type === 'drop') {
      pendingDragUploadPaths.value = event.paths
    }
  }

  function isTauriDropInsideSftp(event: DragDropEvent) {
    if (event.type === 'leave') {
      return false
    }

    const element = '$el' in (sftpDrawerElementRef.value ?? {})
      ? (sftpDrawerElementRef.value as { $el?: HTMLElement }).$el
      : sftpDrawerElementRef.value as HTMLElement | null
    const rect = element?.getBoundingClientRect()

    if (!rect) {
      return false
    }

    return event.position.x >= rect.left && event.position.x <= rect.right && event.position.y >= rect.top && event.position.y <= rect.bottom
  }

  function handleSftpDragLeave(event: DragEvent) {
    if (!(event.currentTarget as HTMLElement)?.contains(event.relatedTarget as Node | null)) {
      isSftpDragging.value = false
      pendingDragUploadDirectory.value = ''
    }
  }

  function handleSftpItemDragEnter(file: SftpFileItem) {
    if (file.isDirectory) {
      pendingDragUploadDirectory.value = file.path
    }
  }

  async function handleSftpDrop(event: DragEvent) {
    isSftpDragging.value = false
    const targetDirectory = pendingDragUploadDirectory.value || currentPath.value
    const localPaths = pendingDragUploadPaths.value
    pendingDragUploadDirectory.value = ''

    if (localPaths.length > 0) {
      pendingDragUploadPaths.value = []
      await uploadLocalPaths(localPaths, targetDirectory)
      return
    }

    const files = await collectDroppedUploadFiles(event.dataTransfer)

    if (files.length === 0) {
      return
    }

    await uploadLocalFiles(files, targetDirectory)
  }

  return {
    isSftpDragging,
    pendingDragUploadDirectory,
    pendingDragUploadPaths,
    registerTauriDragDrop,
    handleSftpDragLeave,
    handleSftpItemDragEnter,
    handleSftpDrop,
  }
}

async function collectDroppedUploadFiles(dataTransfer: DataTransfer | null) {
  const items = Array.from(dataTransfer?.items ?? []) as DataTransferItemWithEntry[]
  const entries = items.map((item) => item.webkitGetAsEntry?.() as DragFileSystemEntry | null).filter((entry): entry is DragFileSystemEntry => Boolean(entry))

  if (entries.length === 0) {
    return Array.from(dataTransfer?.files ?? []).map((file) => ({file, relativePath: file.name}))
  }

  const files: DroppedUploadFile[] = []

  for (const entry of entries) {
    files.push(...await collectEntryUploadFiles(entry, ''))
  }

  return files
}

async function collectEntryUploadFiles(entry: DragFileSystemEntry, parentPath: string): Promise<DroppedUploadFile[]> {
  const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name

  if (entry.isFile) {
    const file = await readEntryFile(entry as DragFileSystemFileEntry)
    return [{file, relativePath}]
  }

  if (!entry.isDirectory) {
    return []
  }

  const children = await readDirectoryEntries(entry as DragFileSystemDirectoryEntry)
  const childFiles = await Promise.all(children.map((child) => collectEntryUploadFiles(child, relativePath)))
  return childFiles.flat()
}

function readEntryFile(entry: DragFileSystemFileEntry) {
  return new Promise<File>((resolve, reject) => {
    entry.file(resolve, reject)
  })
}

function readDirectoryEntries(entry: DragFileSystemDirectoryEntry) {
  const reader = entry.createReader()
  const entries: DragFileSystemEntry[] = []

  return new Promise<DragFileSystemEntry[]>((resolve, reject) => {
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries)
          return
        }

        entries.push(...batch)
        readBatch()
      }, reject)
    }

    readBatch()
  })
}
