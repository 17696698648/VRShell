import {expect, test} from '@playwright/test'
import {installTauriMock} from './fixtures/tauri'

test.describe('security flows', () => {
  test.beforeEach(async ({page}) => {
    await installTauriMock(page)
    await page.goto('/')
  })

  test('renders host key confirmation dialog and accepts trusted hosts @security', async ({page}) => {
    await page.evaluate(() => window.__TAURI_INTERNALS__?.invoke('mock:event:emit', {
      eventName: 'security-hostKeyRequested',
      payload: {
        pendingId: 'pending-1',
        host: 'prod.example.com',
        port: 22,
        fingerprint: 'SHA256:abc123',
        keyType: 'ssh-ed25519',
        reason: 'unknown',
      },
    }))

    const dialog = page.getByRole('alertdialog', {name: 'Unknown Host Key'})
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('prod.example.com:22')).toBeVisible()
    await dialog.getByRole('button', {name: 'Yes, I trust this host'}).click()
    await expect(dialog).toBeHidden()
  })

  test('redacts sensitive content in connection error toasts @security', async ({page}) => {
    await page.evaluate(() => window.__TAURI_INTERNALS__?.invoke('mock:setConnectError', {
      message: 'auth failed: password=super-secret token:abc123',
    }))

    await page.getByRole('button', {name: /New SSH Session/}).click()
    const toast = page.locator('.toast', {hasText: 'Failed to connect quick-session'})
    await expect(toast).toBeVisible()
    await expect(toast).toContainText('password=[redacted] token:[redacted]')
    await expect(toast).not.toContainText('super-secret')
    await expect(toast).not.toContainText('abc123')
  })
})

