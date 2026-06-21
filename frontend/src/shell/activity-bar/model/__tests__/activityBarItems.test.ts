import {describe, expect, it} from 'vitest'
import {createAppCommands} from '../../../../app/lifecycle/createAppCommands'
import {activityBarItems} from '../activityBarItems'

describe('activityBarItems', () => {
  it('uses registered command metadata as the item source', () => {
    const commands = new Map(createAppCommands().map((command) => [command.id, command]))

    expect(activityBarItems.length).toBeGreaterThan(0)
    expect(activityBarItems.every((item) => commands.get(item.commandId)?.title)).toBe(true)
  })
})
