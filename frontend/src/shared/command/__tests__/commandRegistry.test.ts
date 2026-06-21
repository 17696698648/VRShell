import {afterEach, describe, expect, it, vi} from 'vitest'
import {clearCommands, executeCommand, getCommands, registerCommand} from '../commandRegistry'

describe('commandRegistry', () => {
  afterEach(() => clearCommands())

  it('registers and executes commands', async () => {
    const run = vi.fn()
    registerCommand({id: 'test.command', title: 'Test command', group: 'workspace', run})

    expect(getCommands()).toHaveLength(1)
    await executeCommand('test.command', {source: 'test'})

    expect(run).toHaveBeenCalledWith({source: 'test'})
  })
})
