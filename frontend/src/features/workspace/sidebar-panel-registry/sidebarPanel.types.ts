import type {Component} from 'vue'
import type {WorkspacePanel} from '../../../entities/workspace'

export interface SidebarPanelRegistration {
  id: WorkspacePanel
  title: string
  component: Component
  props?: Record<string, unknown>
}
