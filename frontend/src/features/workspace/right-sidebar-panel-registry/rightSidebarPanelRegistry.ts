import {computed, reactive} from 'vue'
import {workspaceState} from '../../../entities/workspace'
import type {RightSidebarPanelRegistration} from './rightSidebarPanel.types'

const rightSidebarPanels = reactive(new Map<string, RightSidebarPanelRegistration>())

export function registerRightSidebarPanel(panel: RightSidebarPanelRegistration) {
  rightSidebarPanels.set(panel.id, panel)
  return () => rightSidebarPanels.delete(panel.id)
}

export function getRightSidebarPanels() {
  return Array.from(rightSidebarPanels.values()).sort((left, right) => (left.order ?? 100) - (right.order ?? 100))
}

export function useRightSidebarPanels() {
  return computed(() => getRightSidebarPanels())
}

export function useActiveRightSidebarPanel() {
  return computed(() => rightSidebarPanels.get(workspaceState.activeRightPanel) ?? null)
}
