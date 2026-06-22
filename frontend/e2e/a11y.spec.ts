import {expect, test} from '@playwright/test'
import {installTauriMock} from './fixtures/tauri'

test.describe('A11y shell affordances', () => {
  test.beforeEach(async ({page}) => {
    await installTauriMock(page)
  })

  test('exposes keyboard friendly landmarks and product entry points', async ({page}) => {
    await page.goto('/')

    await expect(page.getByRole('heading', {name: 'Welcome to VRShell'})).toBeVisible()
    await expect(page.getByRole('button', {name: /New SSH Session/})).toBeVisible()
    await expect(page.getByRole('button', {name: /SFTP Explorer/})).toBeVisible()

    await page.keyboard.press('Control+k')
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toBeHidden()
  })
})
