import type {Component} from 'vue'
import type {PanelPlacement, WorkspaceDockPanel} from '../../../entities/workspace'

export interface DockPanelRegistration {
  id: Exclude<WorkspaceDockPanel, 'none'>
  title: string
  icon?: string
  order?: number
  closable?: boolean
  preferredSize?: number
  placement: Exclude<PanelPlacement, 'sidebar' | 'floating'>
  component: Component
}
