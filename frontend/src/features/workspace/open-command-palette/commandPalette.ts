import {workspaceState} from '../../../entities/workspace'

export function openCommandPalette() {
  workspaceState.commandPaletteOpen = true
}

export function closeCommandPalette() {
  workspaceState.commandPaletteOpen = false
}
