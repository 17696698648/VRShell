import type { ContextMenuType } from './components/SessionTreeGroup.vue'

export type ContextMenuScope = ContextMenuType | 'sftp-directory' | 'sftp-file' | 'editor-tab' | 'session-tab' | 'terminal-tab'

export type WindowMenuId = 'file' | 'edit' | 'view' | 'tools' | 'help'

export type SftpAction =
  | 'upload'
  | 'download'
  | 'create_file'
  | 'create_folder'
  | 'edit'
  | 'open_parent'
  | 'copy_path'
  | 'copy_name'
  | 'copy_cd_command'
  | 'rename'
  | 'delete'
  | 'delete_recursive'
  | 'refresh_directory'
  | 'collapse_all'
