import { expect, test } from '@playwright/test'
import { installTauriMock } from './fixtures/tauri'

test.describe('VRShell smoke', () => {
  test.beforeEach(async ({ page }) => {
    await installTauriMock(page)
  })

  test('covers startup, command palette, session dialog, SFTP drawer, and theme switching @smoke', async ({ page }) => {
    await page.goto('/')

    const shell = page.getByTestId('app-shell')
    await expect(shell).toBeVisible()

    await page.keyboard.press('Control+k')
    const palette = page.getByTestId('command-palette')
    const paletteSearch = page.getByTestId('command-palette-search')
    await expect(palette).toBeVisible()
    await expect(paletteSearch).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(palette).toBeHidden()

    await page.keyboard.press('Control+k')
    await page.locator('[data-command-id="cmd-new-connection"]').click()
    const sessionDialogTitle = page.locator('.base-dialog-header strong').filter({ hasText: 'New Session' })
    await expect(sessionDialogTitle).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sessionDialogTitle).toBeHidden()

    await page.keyboard.press('Control+k')
    await page.locator('[data-command-id="cmd-new-connection"]').click()
    await expect(sessionDialogTitle).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(sessionDialogTitle).toBeHidden()

    await page.getByTestId('activity-sftp').click()
    await expect(page.getByTestId('activity-sftp')).toHaveClass(/active/)

    await page.keyboard.press('Control+k')
    await page.getByTestId('command-palette-search').fill('Midnight')
    const themeOption = page.getByRole('option', { name: /Midnight/ })
    await expect(themeOption).toBeVisible()
    const beforeClass = (await shell.getAttribute('class')) ?? ''
    await themeOption.click()
    await expect(shell).not.toHaveClass(beforeClass)
  })
})
