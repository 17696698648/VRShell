import {expect, test} from '@playwright/test'
import {installTauriMock} from './fixtures/tauri'

const persistedStateWithSession = {
  schemaVersion: 5,
  savedAt: '2026-07-01T00:00:00.000Z',
  data: {
    version: 5,
    sessions: [
      {
        id: 'prod-session',
        name: 'Prod Session',
        host: 'prod.example.com',
        port: 22,
        username: 'deploy',
        protocol: 'ssh',
        groupId: 'all',
        tags: ['favorite'],
        status: 'idle',
      },
    ],
    groups: [{id: 'all', name: '所有', sessionIds: ['prod-session']}],
    activeSessionId: 'prod-session',
    workspaceLayout: {
      activeBottomDockPanel: 'none',
      activeMainView: 'terminal',
      activePanel: 'sessions',
      activeRightPanel: 'connection-info',
      bottomPanelHeight: 240,
      bottomPanelVisible: false,
      compactMode: false,
      density: 'comfortable',
      dockOrder: ['logs', 'tasks'],
      layoutPreset: 'default',
      mainAreaMode: 'single',
      mainSplitRatio: 0.5,
      panelPlacement: 'bottom',
      recentBottomDockPanel: 'logs',
      recentRightPanel: 'connection-info',
      rightPanelVisible: true,
      rightPanelWidth: 360,
      sidebarVisible: true,
      sidebarWidth: 300,
    },
    theme: 'dark',
  },
} as const

test.describe('A11y shell affordances', () => {
  test.beforeEach(async ({page}) => {
    await installTauriMock(page)
  })

  test('exposes keyboard friendly landmarks and product entry points', async ({page}) => {
    await page.goto('/')

    await expect(page.getByRole('heading', {name: 'Welcome to VRShell'})).toBeVisible()
    await expect(page.getByRole('button', {name: /New SSH Session/})).toBeVisible()
    await expect(page.getByRole('button', {name: /Import SSH Config/})).toBeVisible()

    await page.getByRole('button', {name: /Search workspace, sessions, commands/i}).click()
    const quickOpen = page.getByRole('dialog', {name: 'Quick switcher'})
    await expect(quickOpen).toBeVisible()
    const quickOpenInput = quickOpen.getByRole('combobox')
    await quickOpenInput.click()
    await quickOpenInput.press('Escape')
    await expect(quickOpen).toBeHidden()
  })

  test('covers quick-open keyboard behavior', async ({page}) => {
    await page.addInitScript((persistedState) => {
      window.localStorage.setItem('vrshell-ui-state-v1', JSON.stringify(persistedState))
    }, persistedStateWithSession)
    await page.goto('/')

    await page.getByRole('button', {name: /Search workspace, sessions, commands/i}).click()
    const dialog = page.getByRole('dialog', {name: 'Quick switcher'})
    await expect(dialog).toBeVisible()
    const combobox = dialog.getByRole('combobox')
    await combobox.click()
    await combobox.fill('prod')
    const listbox = page.getByRole('listbox')
    await expect(listbox).toBeVisible()
    const firstOption = listbox.getByRole('option').first()
    await expect(firstOption).toContainText(/prod session/i)
    await page.keyboard.press('ArrowDown')
    await expect(firstOption).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()

    await page.getByRole('button', {name: /Search workspace, sessions, commands/i}).click()
    await expect(dialog).toBeVisible()
    await combobox.click()
    await combobox.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('covers session tree and SFTP empty-state accessibility state', async ({page}) => {
    await page.addInitScript((persistedState) => {
      window.localStorage.setItem('vrshell-ui-state-v1', JSON.stringify(persistedState))
    }, persistedStateWithSession)
    await page.goto('/')

    const tree = page.getByRole('tree', {name: 'Sessions'})
    await expect(tree).toBeVisible()
    const firstTreeItem = tree.getByRole('treeitem').first()
    await expect(firstTreeItem).toHaveAttribute('aria-level', /\d+/)
    await firstTreeItem.focus()
    await page.keyboard.press('ArrowRight')
    await expect(firstTreeItem).toHaveAttribute('aria-selected', /true|false/)

    await page.getByRole('button', {name: 'SFTP'}).click()
    await expect(page.getByText(/Connect a session first|No remote files/i)).toBeVisible()
  })
})
