import type {Component} from 'vue'
import type {WorkspaceRightPanel} from '../../../entities/workspace'

export interface RightSidebarPanelRegistration {
  id: WorkspaceRightPanel
  title: string
  icon: Component | string
  order?: number
  tooltip?: string
  badge?: () => {count: number; intent: 'info' | 'warning' | 'danger'; title: string} | undefined
  commandId?: string
  component: Component
  props?: Record<string, unknown>
}
