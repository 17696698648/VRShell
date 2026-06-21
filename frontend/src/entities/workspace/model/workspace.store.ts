import {reactive} from 'vue'
import {getDefaultWorkspaceLayout} from './layoutPersistence'
import type {WorkspaceTheme} from './workspace.types'

export const workspaceState = reactive({
  ...getDefaultWorkspaceLayout(),
  commandPaletteOpen: false,
  quickOpenOpen: false,
  theme: 'dark' as WorkspaceTheme,
})
