export type ThemeName = 'dark' | 'light' | 'high-contrast'

export const defaultTheme: ThemeName = 'dark'

export function isThemeName(value: string | null): value is ThemeName {
  return value === 'dark' || value === 'light' || value === 'high-contrast'
}
