export type ResolvedThemeName = 'dark' | 'light' | 'high-contrast'
export type ThemeName = ResolvedThemeName | 'system'

export const defaultTheme: ThemeName = 'system'

export function isThemeName(value: string | null): value is ThemeName {
  return value === 'system' || value === 'dark' || value === 'light' || value === 'high-contrast'
}

export function resolveSystemTheme(): ResolvedThemeName {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}
