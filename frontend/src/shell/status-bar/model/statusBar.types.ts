export type StatusBarAlignment = 'left' | 'right'
export type StatusBarIconName = 'activity' | 'alert' | 'check' | 'clock' | 'layout' | 'logs' | 'palette' | 'server' | 'sftp' | 'tasks' | 'terminal' | 'terminals'
export type StatusBarIntent = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface StatusBarItem {
  id: string
  align: StatusBarAlignment
  compactLabel?: string
  fullLabel?: string
  priority?: number
  label: string
  title?: string
  icon?: string
  iconName?: StatusBarIconName
  intent?: StatusBarIntent
  tooltip?: string
  onClick?: () => void | Promise<void>
}

export type StatusBarItemFactory = () => StatusBarItem | null
