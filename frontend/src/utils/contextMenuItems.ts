import type {ContextMenuScope} from '../menuTypes'

export type ContextMenuItem = {
  label: string
  action: string
  icon?: string
  danger?: boolean
  separated?: boolean
}

export function getContextMenuItems(type: ContextMenuScope, isAllSessionsGroup: boolean): ContextMenuItem[] {
  if (type === 'group') {
    const baseItems = [
      {label: 'New group', action: 'create_group', icon: '+'},
      {label: 'New session', action: 'create_session', icon: '+'},
    ]

    if (isAllSessionsGroup) {
      return baseItems
    }

    return [
      ...baseItems,
      {label: 'Rename', action: 'rename', icon: 'R', separated: true},
      {label: 'Delete', action: 'delete', icon: 'D', danger: true},
    ]
  }

  if (type === 'session') {
    return [
      {label: 'Connect', action: 'connect', icon: '>'},
      {label: 'New session', action: 'create_session', icon: '+'},
      {label: 'Edit', action: 'edit', icon: 'E', separated: true},
      {label: 'Rename', action: 'rename', icon: 'R'},
      {label: 'Delete', action: 'delete', icon: 'D', danger: true},
    ]
  }

  if (type === 'editor-tab') {
    return [
      {label: 'Save', action: 'save_file'},
      {label: 'Save all', action: 'save_all_files'},
      {label: 'Save modified', action: 'save_dirty_files'},
      {label: 'Close', action: 'close_file'},
      {label: 'Close others', action: 'close_other_files'},
      {label: 'Close left', action: 'close_left_files'},
      {label: 'Close right', action: 'close_right_files'},
      {label: 'Close saved', action: 'close_saved_files'},
      {label: 'Close all', action: 'close_all_files'},
    ]
  }

  if (type === 'session-tab') {
    return [
      {label: 'Close current', action: 'close_current_session'},
      {label: 'Close others', action: 'close_other_sessions'},
      {label: 'Close right', action: 'close_right_sessions'},
      {label: 'Close all', action: 'close_all_sessions'},
    ]
  }

  if (type === 'terminal-tab') {
    return [
      {label: 'Reconnect', action: 'reconnect_terminal'},
      {label: 'Duplicate terminal', action: 'duplicate_terminal'},
      {label: 'Copy SSH command', action: 'copy_ssh_command'},
      {label: 'Close others', action: 'close_other_terminals'},
      {label: 'Close all', action: 'close_all_terminals'},
    ]
  }

  if (type === 'sftp-directory') {
    return [
      {label: 'Upload', action: 'upload'},
      {label: 'Refresh directory', action: 'refresh_directory'},
      {label: 'Collapse all', action: 'collapse_all'},
      {label: 'New file', action: 'create_file'},
      {label: 'New folder', action: 'create_folder'},
      {label: 'Open in Terminal', action: 'open_in_terminal'},
      {label: 'Copy path', action: 'copy_path'},
      {label: 'Copy cd command', action: 'copy_cd_command'},
      {label: 'Rename', action: 'rename'},
      {label: 'Delete', action: 'delete'},
      {label: 'Delete recursively', action: 'delete_recursive'},
    ]
  }

  return [
    {label: 'Edit', action: 'edit'},
    {label: 'Download', action: 'download'},
    {label: 'Open parent', action: 'open_parent'},
    {label: 'Copy path', action: 'copy_path'},
    {label: 'Copy name', action: 'copy_name'},
    {label: 'Rename', action: 'rename'},
    {label: 'Delete', action: 'delete'},
  ]
}
