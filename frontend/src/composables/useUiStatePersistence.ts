import {watch, type Ref} from 'vue'

export const UI_STATE_KEY = 'vrshell-ui-state'

export type PersistedUiState = {
  activeTheme?: string
  showEditorArea?: boolean
  editorPaneHeight?: number
  drawerWidth?: number
  activeDrawer?: string | null
}

export function readPersistedUiState(): PersistedUiState | null {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY)
    if (!raw) return null

    const state = JSON.parse(raw)
    return state && typeof state === 'object' ? state : null
  } catch {
    return null
  }
}

export type UiStatePersistenceRefs<ThemeName extends string> = {
  activeTheme: Ref<ThemeName>
  showEditorArea: Ref<boolean>
  editorPaneHeight: Ref<number>
  drawerWidth: Ref<number>
  activeDrawer: Ref<string | null>
  minDrawerWidth: number
  maxDrawerWidth: number
}

export function useUiStatePersistence<ThemeName extends string>({
                                                                  activeTheme,
                                                                   showEditorArea,
                                                                   editorPaneHeight,
                                                                   drawerWidth,
                                                                   activeDrawer,
                                                                   minDrawerWidth,
                                                                   maxDrawerWidth,
                                                                 }: UiStatePersistenceRefs<ThemeName>) {
  function saveUiState() {
    try {
      localStorage.setItem(UI_STATE_KEY, JSON.stringify({
        activeTheme: activeTheme.value,
        showEditorArea: showEditorArea.value,
        editorPaneHeight: editorPaneHeight.value,
        drawerWidth: drawerWidth.value,
        activeDrawer: activeDrawer.value,
      }))
    } catch {
    }
  }

  function restoreUiState() {
    const state = readPersistedUiState()
    if (!state) return

    if (typeof state.activeTheme === 'string') {
      activeTheme.value = state.activeTheme as ThemeName
    }
    if (typeof state.showEditorArea === 'boolean') {
      showEditorArea.value = state.showEditorArea
    }
    if (typeof state.editorPaneHeight === 'number') {
      editorPaneHeight.value = state.editorPaneHeight
    }
    if (typeof state.drawerWidth === 'number') {
      drawerWidth.value = Math.min(maxDrawerWidth, Math.max(minDrawerWidth, state.drawerWidth))
    } else {
      drawerWidth.value = minDrawerWidth
    }
    if (state.activeDrawer === null || state.activeDrawer === 'sessions' || state.activeDrawer === 'sftp') {
      activeDrawer.value = state.activeDrawer
    }
  }

  watch([activeTheme, showEditorArea, editorPaneHeight, drawerWidth, activeDrawer], saveUiState)

  return {
    saveUiState,
    restoreUiState,
  }
}
