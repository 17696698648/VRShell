import {markRaw} from 'vue'
import {registerDockPanel} from '../../features/workspace/dock-registry'
import {setCompactMode} from '../../entities/workspace'
import {registerSettingsSection} from '../../features/settings/settings-registry'
import {registerSidebarPanel} from '../../features/workspace/sidebar-panel-registry'
import {LogsPanel} from '../../widgets/logs-panel'
import {OutputPanel} from '../../widgets/output-panel'
import {ProblemsPanel} from '../../widgets/problems-panel'
import AppearanceSettingsSection from '../../pages/settings/sections/AppearanceSettingsSection.vue'
import KeybindingsSettingsSection from '../../pages/settings/sections/KeybindingsSettingsSection.vue'
import PlaceholderSettingsSection from '../../pages/settings/sections/PlaceholderSettingsSection.vue'
import SecuritySettingsSection from '../../pages/settings/sections/SecuritySettingsSection.vue'
import SftpSettingsSection from '../../pages/settings/sections/SftpSettingsSection.vue'
import TerminalSettingsSection from '../../pages/settings/sections/TerminalSettingsSection.vue'
import SearchPanel from '../../widgets/search-panel/ui/SearchPanel.vue'
import {SessionDetailPanel} from '../../widgets/session-detail'
import SessionExplorer from '../../widgets/session-explorer/ui/SessionExplorer.vue'
import {SftpItemDetailPanel} from '../../widgets/sftp-item-detail'
import SftpExplorer from '../../widgets/sftp-explorer/ui/SftpExplorer.vue'
import TaskCenter from '../../widgets/task-center/ui/TaskCenter.vue'
import {registerDefaultStatusItems} from '../../shell/status-bar/model/registerDefaultStatusItems'

let disposeStatusItems: (() => void) | null = null
let disposeDockPanels: (() => void) | null = null
let disposeSidebarPanels: (() => void) | null = null
let disposeSettingsSections: (() => void) | null = null
let disposeResponsiveMode: (() => void) | null = null

export function registerGlobalEffects() {
  disposeStatusItems?.()
  disposeDockPanels?.()
  disposeSidebarPanels?.()
  disposeSettingsSections?.()
  disposeResponsiveMode?.()
  disposeStatusItems = registerDefaultStatusItems()
  disposeResponsiveMode = registerResponsiveMode()
  const sidebarDisposables = [
    registerSidebarPanel({id: 'sessions', title: 'Sessions', component: markRaw(SessionExplorer)}),
    registerSidebarPanel({id: 'sftp', title: 'SFTP', component: markRaw(SftpExplorer), props: {compact: true}}),
    registerSidebarPanel({id: 'tasks', title: 'Tasks', component: markRaw(TaskCenter), props: {compact: true}}),
    registerSidebarPanel({id: 'search', title: 'Search', component: markRaw(SearchPanel)}),
  ]
  disposeSidebarPanels = () => sidebarDisposables.forEach((dispose) => dispose())
  const settingsDisposables = [
    registerSettingsSection({id: 'General', title: 'General', order: 10, component: markRaw(PlaceholderSettingsSection)}),
    registerSettingsSection({id: 'Appearance', title: 'Appearance', order: 20, component: markRaw(AppearanceSettingsSection)}),
    registerSettingsSection({id: 'Terminal', title: 'Terminal', order: 30, component: markRaw(TerminalSettingsSection)}),
    registerSettingsSection({id: 'SSH', title: 'SSH', order: 40, component: markRaw(PlaceholderSettingsSection)}),
    registerSettingsSection({id: 'SFTP', title: 'SFTP', order: 50, component: markRaw(SftpSettingsSection)}),
    registerSettingsSection({id: 'Keybindings', title: 'Keybindings', order: 60, component: markRaw(KeybindingsSettingsSection)}),
    registerSettingsSection({id: 'Security', title: 'Security', order: 70, component: markRaw(SecuritySettingsSection)}),
  ]
  disposeSettingsSections = () => settingsDisposables.forEach((dispose) => dispose())
  const disposables = [
    registerDockPanel({id: 'problems', title: 'Problems', icon: '!', order: 10, placement: 'bottom', preferredSize: 220, component: markRaw(ProblemsPanel)}),
    registerDockPanel({id: 'output', title: 'Output', icon: '▣', order: 20, placement: 'bottom', preferredSize: 240, component: markRaw(OutputPanel)}),
    registerDockPanel({id: 'logs', title: 'Logs', icon: '☰', order: 30, placement: 'bottom', preferredSize: 240, component: markRaw(LogsPanel)}),
    registerDockPanel({id: 'session-detail', title: 'Session Detail', icon: 'SSH', order: 10, placement: 'right', preferredSize: 340, component: markRaw(SessionDetailPanel)}),
    registerDockPanel({id: 'sftp-item-detail', title: 'SFTP Detail', icon: '⇄', order: 20, placement: 'right', preferredSize: 340, component: markRaw(SftpItemDetailPanel)}),
  ]
  disposeDockPanels = () => disposables.forEach((dispose) => dispose())
}

export function disposeGlobalEffects() {
  disposeStatusItems?.()
  disposeDockPanels?.()
  disposeSidebarPanels?.()
  disposeSettingsSections?.()
  disposeResponsiveMode?.()
  disposeStatusItems = null
  disposeDockPanels = null
  disposeSidebarPanels = null
  disposeSettingsSections = null
  disposeResponsiveMode = null
}

function registerResponsiveMode() {
  if (typeof window === 'undefined') return () => {}
  const update = () => setCompactMode(window.innerWidth < 1100)
  update()
  window.addEventListener('resize', update)
  return () => window.removeEventListener('resize', update)
}
