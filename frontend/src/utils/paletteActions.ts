export function applyPaletteAction(options: {
  action: string
  payload?: string
  openCreateSessionDialog: () => void
  closeActiveSession: () => void
  toggleSessions: () => void
  openSftp: (mode: 'load' | 'refresh') => void
  collapseAllGroups: () => void
  connectSession: (hostName: string) => void
  switchTheme: (themeName: string) => void
}) {
  if (options.action === 'new_connection' || options.action === 'local_terminal') {
    options.openCreateSessionDialog()
    return
  }

  if (options.action === 'close_session') {
    options.closeActiveSession()
    return
  }

  if (options.action === 'toggle_sessions') {
    options.toggleSessions()
    return
  }

  if (options.action === 'toggle_sftp') {
    options.openSftp('load')
    return
  }

  if (options.action === 'collapse_groups') {
    options.collapseAllGroups()
    return
  }

  if (options.action === 'refresh_sftp') {
    options.openSftp('refresh')
    return
  }

  if (options.action === 'connect_session' && options.payload) {
    options.connectSession(options.payload)
    return
  }

  if (options.action === 'switch_theme' && options.payload) {
    options.switchTheme(options.payload)
  }
}
