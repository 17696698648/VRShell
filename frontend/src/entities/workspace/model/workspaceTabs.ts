import {computed, reactive} from 'vue'
import {terminalState} from '../../terminal'
import {workspaceState} from './workspace.store'

export type WorkspaceTabKind = 'terminal' | 'settings' | 'welcome' | 'editor'

export interface WorkspaceTab {
  id: string
  kind: WorkspaceTabKind
  title: string
  subtitle?: string
  status?: string
  closable?: boolean
  pinned?: boolean
  dirty?: boolean
}

const tabState = reactive({
  openTabs: [
    {id: 'welcome', kind: 'welcome', title: 'Welcome', subtitle: 'Start here', closable: true},
    {id: 'settings', kind: 'settings', title: 'Settings', subtitle: 'Preferences', closable: true},
  ] as WorkspaceTab[],
  activeTabId: 'welcome',
})

export const workspaceTabs = computed<WorkspaceTab[]>(() => {
  const terminalTabs: WorkspaceTab[] = terminalState.tabs.map((tab) => ({
    id: tab.id,
    kind: 'terminal',
    status: tab.status,
    subtitle: tab.cwd,
    title: tab.title,
    closable: true,
  }))
  return [...terminalTabs, ...tabState.openTabs]
})

export function openWorkspaceTab(tab: WorkspaceTab) {
  const existing = tabState.openTabs.find((item) => item.id === tab.id)
  if (existing) Object.assign(existing, tab)
  else tabState.openTabs.push(tab)
  activateWorkspaceTab(tab.id)
}

export function activateWorkspaceTab(tabId: string) {
  tabState.activeTabId = tabId
  if (tabId === 'settings') workspaceState.activeMainView = 'settings'
  else if (tabId === 'editor') workspaceState.activeMainView = 'editor'
  else if (tabId === 'welcome') workspaceState.activeMainView = 'welcome'
  else workspaceState.activeMainView = 'terminal'
  if (terminalState.tabs.some((tab) => tab.id === tabId)) terminalState.activeTerminalId = tabId
}

export function closeWorkspaceTab(tabId: string) {
  const index = tabState.openTabs.findIndex((tab) => tab.id === tabId && tab.closable !== false && !tab.pinned)
  if (index >= 0) tabState.openTabs.splice(index, 1)
  if (tabState.activeTabId === tabId) activateWorkspaceTab(terminalState.tabs[0]?.id ?? tabState.openTabs[0]?.id ?? 'welcome')
}

export function pinWorkspaceTab(tabId: string, pinned = true) {
  const tab = tabState.openTabs.find((item) => item.id === tabId)
  if (tab) tab.pinned = pinned
}

export function markWorkspaceTabDirty(tabId: string, dirty = true) {
  const tab = tabState.openTabs.find((item) => item.id === tabId)
  if (tab) tab.dirty = dirty
}

export function restoreWorkspaceTabs(tabs: WorkspaceTab[]) {
  tabState.openTabs.splice(0, tabState.openTabs.length, ...tabs)
}

export function reorderWorkspaceTabs(sourceId: string, targetId: string) {
  const sourceIndex = tabState.openTabs.findIndex((tab) => tab.id === sourceId)
  const targetIndex = tabState.openTabs.findIndex((tab) => tab.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return
  const [tab] = tabState.openTabs.splice(sourceIndex, 1)
  tabState.openTabs.splice(targetIndex, 0, tab)
}
