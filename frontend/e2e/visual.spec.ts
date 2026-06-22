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

  test('captures welcome product entry', async ({page}) => {
    await page.goto('/')
    await expect(page.locator('.welcome-page')).toHaveScreenshot('welcome-product-entry.png')
  })

  test('captures session explorer', async ({page}) => {
    await page.goto('/')
    await expect(page.locator('.session-explorer')).toHaveScreenshot('session-explorer.png')
  })

  test('captures SFTP explorer', async ({page}) => {
    await page.goto('/')
    await page.getByTitle(/SFTP/).click()
    await expect(page.locator('.sftp-explorer')).toHaveScreenshot('sftp-explorer.png')
  })

  test('captures status bar', async ({page}) => {
    await page.goto('/')
    await expect(page.locator('.status-bar')).toHaveScreenshot('status-bar.png')
  })

  test('captures command menu surface', async ({page}) => {
    await page.goto('/')
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('menu')).toHaveScreenshot('command-menu.png')
  })
})
