export type CommandCategory = 'Session' | 'Terminal' | 'SFTP' | 'Workspace' | 'Settings'
export type CommandGroup = 'session' | 'terminal' | 'sftp' | 'workspace' | 'settings'
export type CommandScope = 'global' | 'workbench' | 'terminal' | 'sftp' | 'dialog' | 'input'

export interface AppCommand {
  id: string
  title: string
  group: CommandGroup
  category?: CommandCategory
  description?: string
  icon?: string
  shortcut?: string
  scope?: CommandScope
  keywords?: string[]
  priority?: number
  when?: () => boolean
  disabledReason?: () => string | null
  dangerous?: boolean
  visibleInPalette?: boolean
  visibleInMenu?: boolean
  run: (payload?: unknown) => void | Promise<void>
}

export interface CommandAvailability {
  enabled: boolean
  visible: boolean
  disabledReason: string | null
}
