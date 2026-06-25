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

export function useBottomDockPanel() {
  return computed(() => {
    if (!workspaceState.bottomPanelVisible || workspaceState.activeBottomDockPanel === 'none') return null
    return dockPanels.get(workspaceState.activeBottomDockPanel) ?? null
  })
}

export function useRightDockPanel() {
  return computed(() => {
    if (!workspaceState.rightPanelVisible || workspaceState.activeRightDockPanel === 'none') return null
    return dockPanels.get(workspaceState.activeRightDockPanel) ?? null
  })
}
