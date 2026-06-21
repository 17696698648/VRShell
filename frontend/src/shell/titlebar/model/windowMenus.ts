export interface WindowMenuItem {
  commandId: string
}

export interface WindowMenuGroup {
  id: string
  label: string
  items: WindowMenuItem[]
}

export const windowMenus: WindowMenuGroup[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {commandId: 'workspace.openCommandPalette'},
      {commandId: 'workspace.quickOpen'},
    ],
  },
  {
    id: 'panels',
    label: 'Panels',
    items: [
      {commandId: 'workspace.openSessionsPanel'},
      {commandId: 'sftp.openPanel'},
      {commandId: 'workspace.openTasksPanel'},
      {commandId: 'workspace.openLogsPanel'},
      {commandId: 'workspace.openProblemsPanel'},
      {commandId: 'workspace.openOutputPanel'},
      {commandId: 'workspace.openSessionDetail'},
      {commandId: 'workspace.openSftpItemDetail'},
      {commandId: 'settings.openPanel'},
    ],
  },
  {
    id: 'session',
    label: 'Session',
    items: [
      {commandId: 'session.createQuick'},
      {commandId: 'session.importSshConfig'},
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      {commandId: 'terminal.search'},
      {commandId: 'terminal.reconnectActive'},
      {commandId: 'terminal.broadcastCommand'},
      {commandId: 'settings.toggleTheme'},
    ],
  },
]
