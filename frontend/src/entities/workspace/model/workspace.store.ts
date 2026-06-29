import {reactive} from 'vue'
import {getDefaultWorkspaceLayout} from './layoutPersistence'
import type {WorkspaceTheme} from './workspace.types'

export const workspaceState = reactive({
  ...getDefaultWorkspaceLayout(),
  activePanelRegion: 'main' as 'left' | 'main' | 'right',
  commandPaletteOpen: false,
  quickOpenOpen: false,
  settingsDialogOpen: false,
  theme: 'dark' as WorkspaceTheme,
})
