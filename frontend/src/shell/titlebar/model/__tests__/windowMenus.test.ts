import {describe, expect, it} from 'vitest'
import {createAppCommands} from '../../../../app/lifecycle/createAppCommands'
import {windowMenus} from '../windowMenus'

describe('windowMenus', () => {
  it('references registered command ids', () => {
    const commands = createAppCommands()
    const commandIds = new Set(commands.map((command) => command.id))
    const menuCommandIds = windowMenus.flatMap((menu) => menu.items.map((item) => item.commandId))

    expect(menuCommandIds.length).toBeGreaterThan(0)
    expect(menuCommandIds.every((commandId) => commandIds.has(commandId))).toBe(true)
  })

  it('uses registered command metadata as the menu item source', () => {
    const commands = new Map(createAppCommands().map((command) => [command.id, command]))
    const menuItems = windowMenus.flatMap((menu) => menu.items)

    expect(menuItems.every((item) => commands.get(item.commandId)?.title)).toBe(true)
  })
})
