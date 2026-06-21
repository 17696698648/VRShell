import {computed, reactive} from 'vue'
import {workspaceState} from '../../../entities/workspace'
import type {DockPanelRegistration} from './dockPanel.types'

const dockPanels = reactive(new Map<string, DockPanelRegistration>())

export function registerDockPanel(panel: DockPanelRegistration) {
  dockPanels.set(panel.id, panel)
  return () => dockPanels.delete(panel.id)
}

export function getDockPanels() {
  return Array.from(dockPanels.values())
}

export function useActiveDockPanel() {
  return computed(() => {
    if (!workspaceState.bottomPanelVisible || workspaceState.activeDockPanel === 'none') return null
    return dockPanels.get(workspaceState.activeDockPanel) ?? null
  })
}
