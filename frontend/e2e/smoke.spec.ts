import {expect, test} from '@playwright/test'
import {installTauriMock} from './fixtures/tauri'

test.beforeEach(async ({page}) => {
  await installTauriMock(page)
  await page.goto('/')
})

test.describe('smoke', () => {
  test('renders the workbench welcome screen @smoke', async ({page}) => {
    await expect(page.getByTestId('app-shell')).toBeVisible()
    await expect(page.getByRole('heading', {name: 'Welcome to VRShell'})).toBeVisible()
    await expect(page.getByRole('button', {name: /New SSH Session/})).toBeVisible()
  })

  test('opens command palette from welcome action @smoke', async ({page}) => {
    await page.getByRole('button', {name: /Command Palette/}).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByPlaceholder(/Type a command/i)).toBeVisible()
  })

  test('opens session creation form with password auth @smoke', async ({page}) => {
    await page.getByRole('button', {name: /New SSH Session/}).click()

    await expect(page.getByRole('heading', {name: 'New session'})).toBeVisible()
    await page.getByLabel('Authentication').selectOption('password')
    await expect(page.getByPlaceholder('Password')).toBeVisible()
  })

  test('opens SFTP explorer panel @smoke', async ({page}) => {
    await page.getByRole('button', {name: 'SFTP Explorer'}).click()

    await expect(page.getByText('SFTP Explorer').first()).toBeVisible()
  })
})
