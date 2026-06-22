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

  test('covers command menu keyboard behavior', async ({page}) => {
    await page.goto('/')
    await page.keyboard.press('Control+k')
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()

    await page.keyboard.press('s')
    await expect(page.locator('[role="menuitem"]:focus')).toContainText(/s/i)
    await page.keyboard.press('Enter')
    await expect(menu).toBeHidden()

    await page.keyboard.press('Control+k')
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toBeHidden()
  })

  test('covers tree expanded state and data grid empty/selection state', async ({page}) => {
    await page.goto('/')

    const tree = page.getByRole('tree', {name: 'Sessions'})
    await expect(tree).toBeVisible()
    const firstTreeItem = tree.getByRole('treeitem').first()
    await expect(firstTreeItem).toHaveAttribute('aria-level', /\d+/)
    await firstTreeItem.focus()
    await page.keyboard.press('ArrowRight')
    await expect(firstTreeItem).toHaveAttribute('aria-expanded', /true|false/)

    await page.getByTitle(/SFTP/).click()
    const grid = page.getByRole('grid', {name: 'Remote files'})
    await expect(grid).toBeVisible()
    await expect(grid).toHaveAttribute('aria-colcount', /\d+/)
    await expect(grid.getByText(/No remote files|DIR|FILE/)).toBeVisible()
    const selectedRow = grid.locator('[role="row"][aria-selected="true"]').first()
    if (await selectedRow.count()) await expect(selectedRow).toHaveAttribute('tabindex', '0')
  })
})
