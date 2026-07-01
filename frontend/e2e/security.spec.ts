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
    await expect(dialog.getByText('Compare this fingerprint with a trusted source before accepting')).toBeVisible()
    await dialog.getByRole('button', {name: 'Accept and save host key'}).click()
    await expect(dialog).toBeHidden()
  })

  test('renders changed host key warning and blocks direct trust action @security', async ({page}) => {
    await page.evaluate(() => window.__TAURI_INTERNALS__?.invoke('mock:event:emit', {
      eventName: 'security-hostKeyRequested',
      payload: {
        pendingId: '',
        host: 'prod.example.com',
        port: 22,
        fingerprint: 'SHA256:new-key',
        keyType: 'ssh-ed25519',
        reason: 'changed',
        knownFingerprint: 'SHA256:old-key',
      },
    }))

    const dialog = page.getByRole('alertdialog', {name: 'Host Key Changed'})
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Known fingerprint:')).toBeVisible()
    await expect(dialog.getByText('SHA256:old-key')).toBeVisible()
    await expect(dialog.getByText('SHA256:new-key')).toBeVisible()
    await expect(dialog.getByText('Stop unless an administrator confirms the server was re-keyed')).toBeVisible()
    await expect(dialog.getByRole('button', {name: 'Disabled for changed keys'})).toBeDisabled()

    await dialog.getByRole('button', {name: 'No', exact: true}).click()
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
