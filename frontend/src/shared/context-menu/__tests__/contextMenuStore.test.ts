import {afterEach, describe, expect, it, vi} from 'vitest'
import {closeContextMenu, contextMenuState, executeContextMenuItem, openContextMenu} from '../contextMenuStore'

describe('contextMenuStore', () => {
  afterEach(() => closeContextMenu())

  it('opens and closes context menus', () => {
    openContextMenu({x: 12, y: 24, items: [{id: 'copy', label: 'Copy', run: vi.fn()}]})

    expect(contextMenuState.menu).toMatchObject({x: 12, y: 24})

    closeContextMenu()

    expect(contextMenuState.menu).toBeNull()
  })

  it('executes enabled items and closes the menu', async () => {
    const run = vi.fn()
    const item = {id: 'open', label: 'Open', run}
    openContextMenu({x: 0, y: 0, items: [item]})

    await executeContextMenuItem(item)

    expect(run).toHaveBeenCalledOnce()
    expect(contextMenuState.menu).toBeNull()
  })

  it('ignores disabled items', async () => {
    const run = vi.fn()
    await executeContextMenuItem({id: 'delete', label: 'Delete', disabled: true, run})

    expect(run).not.toHaveBeenCalled()
  })
})
