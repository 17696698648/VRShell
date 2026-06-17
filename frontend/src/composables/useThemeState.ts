import {computed, ref, watchEffect} from 'vue'
import {readPersistedUiState} from './useUiStatePersistence'

export type ThemeName = 'professional' | 'midnight' | 'contrast'

export const themes: { id: ThemeName; name: string }[] = [
  {id: 'professional', name: 'Professional Dark'},
  {id: 'midnight', name: 'Midnight'},
  {id: 'contrast', name: 'High Contrast'},
]

export function isThemeName(value: unknown): value is ThemeName {
  return themes.some((theme) => theme.id === value)
}

export function applyThemeToDocument(theme: ThemeName) {
  document.documentElement.classList.add('dark')
  document.documentElement.dataset.theme = theme
}

export function applyInitialThemeToDocument() {
  const storedTheme = readPersistedUiState()?.activeTheme
  applyThemeToDocument(isThemeName(storedTheme) ? storedTheme : 'professional')
}

export function useThemeState() {
  const activeTheme = ref<ThemeName>('professional')
  const currentThemeName = computed(() => (
    themes.find((theme) => theme.id === activeTheme.value)?.name ?? 'Professional Dark'
  ))

  watchEffect(() => {
    applyThemeToDocument(activeTheme.value)
  })

  return {
    activeTheme,
    currentThemeName,
    themes,
  }
}
