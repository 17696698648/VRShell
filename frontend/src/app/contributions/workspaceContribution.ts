import type {AppCommand} from '../../features/workspace/command-registry'
import type {DockPanelRegistration} from '../../features/workspace/dock-registry'
import type {SettingsSectionRegistration} from '../../features/settings/settings-registry'
import type {SidebarPanelRegistration} from '../../features/workspace/sidebar-panel-registry'
import type {StatusBarItemFactory} from '../../shell/status-bar/model/statusBar.types'

export interface WorkspaceContribution {
  commands?: AppCommand[]
  dockPanels?: DockPanelRegistration[]
  settingsSections?: SettingsSectionRegistration[]
  sidebarPanels?: SidebarPanelRegistration[]
  statusItems?: Array<{id: string; factory: StatusBarItemFactory}>
}
