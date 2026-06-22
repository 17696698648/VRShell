import type {Component} from 'vue'
import type {WorkspacePanel} from '../../../entities/workspace'

export interface SidebarPanelRegistration {
  id: WorkspacePanel
  title: string
  icon: Component | string
  order?: number
  shortcut?: string
  tooltip?: string
  badge?: () => {count: number; intent: 'info' | 'warning' | 'danger'; title: string} | undefined
  commandId?: string
  component: Component
  props?: Record<string, unknown>
}
