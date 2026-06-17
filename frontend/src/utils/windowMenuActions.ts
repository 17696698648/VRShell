import type {WindowMenuAction} from '../windowMenus'

export type WindowMenuActionHandlers = {
  closeWindowMenu: () => void
  openCreateSessionDialog: () => void
  closeActiveSession: () => void
  toggleSessionsDrawer: () => void
  openSftpDrawer: (mode: 'load' | 'refresh') => void
  collapseAllGroups: () => void
  testSessionConnection: () => void
  showAbout: () => void
}

export function runWindowMenuAction(action: WindowMenuAction, handlers: WindowMenuActionHandlers) {
  handlers.closeWindowMenu()

  switch (action) {
    case 'new_connection':
    case 'local_terminal':
      handlers.openCreateSessionDialog()
      return true
    case 'close_session':
      handlers.closeActiveSession()
      return true
    case 'toggle_sessions':
      handlers.toggleSessionsDrawer()
      return true
    case 'toggle_sftp':
      handlers.openSftpDrawer('load')
      return true
    case 'refresh_sftp':
      handlers.openSftpDrawer('refresh')
      return true
    case 'collapse_groups':
      handlers.collapseAllGroups()
      return true
    case 'test_connection':
      handlers.testSessionConnection()
      return true
    case 'about':
      handlers.showAbout()
      return true
    case 'rename':
    case 'delete':
    case 'copy_path':
      return false
    default:
      return assertNever(action)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled window menu action: ${value}`)
}
