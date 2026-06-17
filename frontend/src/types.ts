export type SftpFileIcon = {
  type: string
  color: string
  label?: string
  variant?: 'brand' | 'badge' | 'lucide'
}

export type SftpFileItem = {
  name: string
  path: string
  icon: SftpFileIcon
  meta: string
  size: string
  sizeBytes: number
  modified: number
  modifiedText: string
  isDirectory: boolean
  isSymlink?: boolean
  symlinkTarget?: string
}

export type SftpSortKey = 'name' | 'size' | 'modified'

export type SftpTreeNode = SftpFileItem & {
  children: SftpTreeNode[]
  depth: number
  expanded: boolean
  loading: boolean
  loaded: boolean
}

export type EditorFile = {
  name: string
  path: string
  content: string
  language: string
  selected: boolean
  dirty: boolean
  remoteModified: number
  remoteSizeBytes: number
}

export type TerminalTab = {
  id: string
  name: string
  selected: boolean
  sessionId: string
  status: TerminalStatus
  error: string
}

export type TerminalStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'

export type SftpTask = {
  id: string
  type: 'upload' | 'download' | 'delete'
  status: 'idle' | 'queued' | 'running' | 'success' | 'error' | 'canceling' | 'canceled'
  progress: number
  currentFile: string
  error: string
  cancelable: boolean
  sessionKey: string
  deleted: number
}

export type WorkspaceState = {
  showEditorArea: boolean
  editorPaneHeight: number
  sftpPath: string
  sftpFiles: SftpFileItem[]
  sftpTree: SftpTreeNode[]
  sftpSearchText: string
  sftpStatus: string
  sftpSortKey: SftpSortKey
  sftpSortDirection: 'asc' | 'desc'
  editorTabs: EditorFile[]
  terminalTabs: TerminalTab[]
}

export type ToastMessage = {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
}

export type DroppedUploadFile = {
  file: File
  relativePath: string
}

export type SftpUploadSummary = {
  uploaded: number
  failed: Array<{
    remotePath: string
    error: string
  }>
}

export type DragFileSystemEntry = {
  name: string
  fullPath: string
  isFile: boolean
  isDirectory: boolean
}

export type DragFileSystemFileEntry = DragFileSystemEntry & {
  file: (successCallback: (file: File) => void, errorCallback?: (error: DOMException) => void) => void
}

export type DragFileSystemDirectoryEntry = DragFileSystemEntry & {
  createReader: () => {
    readEntries: (successCallback: (entries: DragFileSystemEntry[]) => void, errorCallback?: (error: DOMException) => void) => void
  }
}

export type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => DragFileSystemEntry | null
}
