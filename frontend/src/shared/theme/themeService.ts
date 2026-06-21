import {defaultTheme, isThemeName, type ThemeName} from './theme.types'

const storageKey = 'vrshell-theme'

export function applyInitialTheme() {
  const storedTheme = localStorage.getItem(storageKey)
  setTheme(isThemeName(storedTheme) ? storedTheme : defaultTheme)
}

export function setTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(storageKey, theme)
}
