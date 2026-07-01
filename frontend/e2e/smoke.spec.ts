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
    await page.keyboard.press('Control+K')

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByPlaceholder(/Type a command/i)).toBeVisible()
  })

  test('opens session creation form with password auth @smoke', async ({page}) => {
    await page.getByRole('button', {name: 'New session', exact: true}).click()

    await expect(page.getByRole('heading', {name: 'New session'})).toBeVisible()
    await page.getByLabel('Authentication').selectOption('password')
    await expect(page.getByPlaceholder('Password')).toBeVisible()
  })

  test('opens SFTP explorer panel @smoke', async ({page}) => {
    await page.keyboard.press('Control+K')
    await page.getByTestId('command-palette-search').fill('Open SFTP panel')
    await page.keyboard.press('Enter')

    await expect(page.getByText('Remote files').first()).toBeVisible()
  })

  test('shows General and SSH settings sections @smoke', async ({page}) => {
    await page.keyboard.press('Control+,')

    const settingsDialog = page.getByRole('dialog', {name: 'Settings'})
    await expect(settingsDialog).toBeVisible()
    await settingsDialog.getByRole('button', {name: 'General General'}).click()
    await expect(page.getByRole('heading', {name: 'General'})).toBeVisible()
    await expect(page.getByText('Workspace summary')).toBeVisible()

    await settingsDialog.getByRole('button', {name: 'SSH General'}).click()
    await expect(page.getByRole('heading', {name: 'SSH'})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Copy result'})).toBeDisabled()
    await settingsDialog.getByRole('textbox', {name: 'Host'}).fill('example.com')
    await settingsDialog.getByRole('textbox', {name: 'Username'}).fill('deploy')
    await page.getByRole('button', {name: 'Measure latency'}).click()
    await expect(page.getByText('TCP latency: 42 ms')).toBeVisible()
  })

  test('opens SFTP toolbar menus for connected sessions @smoke', async ({page}) => {
    await page.getByRole('button', {name: /New SSH Session/}).click()
    await expect(page.getByText('.env')).toBeVisible()

    await page.getByLabel('New remote item').click({force: true})
    await expect(page.getByRole('menuitem', {name: 'New folder'})).toBeVisible()
    await expect(page.getByRole('menuitem', {name: 'New file'})).toBeVisible()
    await page.getByRole('menu').press('Escape')
    await expect(page.getByRole('menu')).toBeHidden()

    await page.getByLabel('Upload to current directory').click({force: true})
    await expect(page.getByRole('menuitem', {name: 'Upload file · overwrite'})).toBeVisible()
    await expect(page.getByRole('menuitem', {name: 'Upload file · skip existing'})).toBeVisible()
    await expect(page.getByRole('menuitem', {name: 'Upload file · auto rename'})).toBeVisible()
    await expect(page.getByRole('menuitem', {name: 'Upload folder'})).toBeVisible()
  })

  test('loads additional SFTP pages for large directories @smoke', async ({page}) => {
    await page.getByRole('button', {name: /New SSH Session/}).click()
    await expect(page.getByText('.env')).toBeVisible()
    await page.getByRole('button', {name: 'List'}).click({force: true})
    await expect(page.getByRole('button', {name: 'Load more'})).toBeVisible()

    await page.getByRole('button', {name: 'Load more'}).click()
    await expect.poll(async () => {
      const calls = await page.evaluate(() => window.__TAURI_INTERNALS__?.invoke('mock:getInvocations')) as Array<{command: string; args?: {cursor?: string | null}}>
      const pagedCalls = calls.filter((entry) => entry.command === 'sftp_list')
      return pagedCalls.some((entry) => entry.args?.cursor === 'offset:200')
    }).toBeTruthy()
  })

  test('marks remote editor files dirty and exposes save @smoke', async ({page}) => {
    await page.getByRole('button', {name: /New SSH Session/}).click()
    await expect(page.getByText('.env')).toBeVisible()

    await page.getByText('.env').dblclick()
    const editor = page.locator('.session-editor-area__pane')
    await expect(editor).toBeVisible()
    await editor.fill('KEY=updated\n')

    await expect(page.getByText('Unsaved changes')).toBeVisible()
    await expect(page.getByRole('button', {name: 'Save'})).toBeEnabled()
  })

  test('switches workbench panels on narrow viewports @smoke', async ({page}) => {
    await page.getByRole('button', {name: /New SSH Session/}).click()
    await page.setViewportSize({width: 1000, height: 720})
    await page.keyboard.press('Control+K')
    await page.getByTestId('command-palette-search').fill('Open Task Queue')
    await page.keyboard.press('Enter')

    await expect(page.locator('.task-center')).toBeVisible()
    await expect(page.getByText('Upload app.tar.gz')).toBeVisible()
    await expect(page.getByRole('heading', {name: 'Welcome to VRShell'})).not.toBeVisible()
  })

  test('cancels running background tasks from task queue @smoke', async ({page}) => {
    await page.keyboard.press('Control+K')
    await page.getByTestId('command-palette-search').fill('Open Task Queue')
    await page.keyboard.press('Enter')

    const uploadTask = page.locator('.task-item', {hasText: 'Upload app.tar.gz'})
    await expect(uploadTask).toBeVisible()
    await uploadTask.getByRole('button', {name: 'Cancel'}).click()
    await expect(uploadTask).toHaveClass(/task-item--cancelled/)
    await expect(uploadTask.getByText('Retry unavailable')).toBeVisible()
  })
})
