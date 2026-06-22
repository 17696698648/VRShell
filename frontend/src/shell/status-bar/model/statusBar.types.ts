export type StatusBarAlignment = 'left' | 'right'
export type StatusBarIntent = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface StatusBarItem {
  id: string
  align: StatusBarAlignment
  priority?: number
  label: string
  title?: string
  icon?: string
  iconName?: string
  intent?: StatusBarIntent
  onClick?: () => void | Promise<void>
}

export type StatusBarItemFactory = () => StatusBarItem | null
