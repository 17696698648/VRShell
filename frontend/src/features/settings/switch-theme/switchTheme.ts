import {workspaceState} from '../../../entities/workspace'
import type {WorkspaceTheme} from '../../../entities/workspace'
import {setTheme} from '../../../shared/theme/themeService'

export function switchTheme(theme: WorkspaceTheme) {
  workspaceState.theme = theme
  setTheme(theme)
}
