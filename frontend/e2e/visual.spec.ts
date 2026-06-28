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

  test('captures task queue bottom dock', async ({page}) => {
    await page.goto('/')
    await page.keyboard.press('Control+K')
    await page.getByTestId('command-palette-search').fill('Open Task Queue')
    await page.keyboard.press('Enter')
    await expect(page.locator('.task-center')).toHaveScreenshot('task-queue.png')
  })

  test('captures log center bottom dock', async ({page}) => {
    await page.goto('/')
    await page.keyboard.press('Control+K')
    await page.getByTestId('command-palette-search').fill('Open Log Center')
    await page.keyboard.press('Enter')
    await expect(page.locator('.logs-panel')).toHaveScreenshot('logs-panel.png')
  })

  test('captures status bar', async ({page}) => {
    await page.goto('/')
    await expect(page.locator('.status-bar')).toHaveScreenshot('status-bar.png')
  })

  test('captures command menu surface', async ({page}) => {
    await page.goto('/')
    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('command-palette')).toHaveScreenshot('command-menu.png')
  })

  test('captures settings form controls', async ({page}) => {
    await page.goto('/')
    await page.keyboard.press('Control+,')
    await expect(page.locator('.settings-page')).toHaveScreenshot('settings-form-controls.png')
  })

  test('captures session create form', async ({page}) => {
    await page.goto('/')
    await page.getByRole('button', {name: 'New session', exact: true}).click()
    await expect(page.getByRole('dialog', {name: 'New session'})).toHaveScreenshot('session-create-form.png')
  })

  test('captures command palette filtered state', async ({page}) => {
    await page.goto('/')
    await page.keyboard.press('Control+k')
    await page.getByTestId('command-palette-search').fill('layout')
    await expect(page.getByTestId('command-palette')).toHaveScreenshot('command-menu-filtered-layout.png')
  })
})
