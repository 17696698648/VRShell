import {expect, test} from '@playwright/test'
import {installTauriMock} from './fixtures/tauri'

const themes = ['dark', 'light', 'high-contrast'] as const
const densities = ['dense', 'compact', 'comfortable'] as const

test.describe('VRShell visual states', () => {
  test.beforeEach(async ({page}) => {
    await installTauriMock(page)
  })

  for (const theme of themes) {
    test(`captures ${theme} workbench shell`, async ({page}) => {
      await page.goto('/')
      await page.evaluate((themeName) => {
        document.documentElement.dataset.theme = themeName
      }, theme)
      await expect(page.getByTestId('app-shell')).toHaveScreenshot(`workbench-${theme}.png`)
    })
  }

  for (const density of densities) {
    test(`captures ${density} density`, async ({page}) => {
      await page.goto('/')
      await page.evaluate((densityName) => {
        document.documentElement.dataset.density = densityName
      }, density)
      await expect(page.getByTestId('app-shell')).toHaveScreenshot(`workbench-density-${density}.png`)
    })
  }
})
