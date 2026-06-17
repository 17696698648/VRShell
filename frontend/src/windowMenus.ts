import type {WindowMenuId} from './menuTypes'

export type WindowMenuAction =
  | 'new_connection'
  | 'local_terminal'
  | 'close_session'
  | 'rename'
  | 'delete'
  | 'copy_path'
  | 'toggle_sessions'
  | 'toggle_sftp'
  | 'collapse_groups'
  | 'refresh_sftp'
  | 'test_connection'
  | 'about'

export type WindowMenuItem = {
  label: string
  action: WindowMenuAction
  shortcut?: string
}

export type WindowMenu = {
  id: WindowMenuId
  label: string
  items: WindowMenuItem[]
}

export const windowMenus: WindowMenu[] = [
  {
    id: 'file',
    label: 'File',
    items: [
      {label: 'New Connection', action: 'new_connection', shortcut: 'Ctrl+N'},
      {label: 'Open Local Terminal', action: 'local_terminal'},
      {label: 'Close Session', action: 'close_session', shortcut: 'Ctrl+W'},
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      {label: 'Rename', action: 'rename'},
      {label: 'Delete', action: 'delete'},
      {label: 'Copy Path', action: 'copy_path'},
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      {label: 'Toggle Sessions', action: 'toggle_sessions'},
      {label: 'Toggle SFTP', action: 'toggle_sftp'},
      {label: 'Collapse Groups', action: 'collapse_groups'},
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      {label: 'Refresh SFTP', action: 'refresh_sftp'},
      {label: 'Test Connection', action: 'test_connection'},
    ],
  },
  {
    id: 'help',
    label: 'Help',
    items: [
      {label: 'About VRShell', action: 'about'},
    ],
  },
]
