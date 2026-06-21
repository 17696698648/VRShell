import {computed, reactive} from 'vue'
import {workspaceState} from '../../../entities/workspace'
import type {SidebarPanelRegistration} from './sidebarPanel.types'

const sidebarPanels = reactive(new Map<string, SidebarPanelRegistration>())

export function registerSidebarPanel(panel: SidebarPanelRegistration) {
  sidebarPanels.set(panel.id, panel)
  return () => sidebarPanels.delete(panel.id)
}

export function getSidebarPanels() {
  return Array.from(sidebarPanels.values())
}

export function useActiveSidebarPanel() {
  return computed(() => sidebarPanels.get(workspaceState.activePanel) ?? null)
}
