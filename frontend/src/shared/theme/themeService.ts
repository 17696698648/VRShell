import {defaultTheme, isThemeName, resolveSystemTheme, type ThemeName} from './theme.types'

const storageKey = 'vrshell-theme'
let systemThemeCleanup: (() => void) | null = null

export function applyInitialTheme() {
  const storedTheme = localStorage.getItem(storageKey)
  setTheme(isThemeName(storedTheme) ? storedTheme : defaultTheme)
}

export function setTheme(theme: ThemeName) {
  systemThemeCleanup?.()
  systemThemeCleanup = null
  document.documentElement.dataset.themePreference = theme
  applyResolvedTheme(theme)
  localStorage.setItem(storageKey, theme)
  if (theme !== 'system' || typeof window === 'undefined') return
  const media = window.matchMedia?.('(prefers-color-scheme: light)')
  if (!media) return
  const handleChange = () => applyResolvedTheme('system')
  media.addEventListener('change', handleChange)
  systemThemeCleanup = () => media.removeEventListener('change', handleChange)
}

function applyResolvedTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme === 'system' ? resolveSystemTheme() : theme
}
