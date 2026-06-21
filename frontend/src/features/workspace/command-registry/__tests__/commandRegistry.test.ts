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

  it('skips commands when context is unavailable', async () => {
    const run = vi.fn()
    registerCommand({id: 'test.disabled-context', title: 'Disabled by context', group: 'workspace', when: () => false, run})

    await executeCommand('test.disabled-context')

    expect(run).not.toHaveBeenCalled()
  })

  it('reports disabled command reason', async () => {
    registerCommand({
      id: 'test.disabled-reason',
      title: 'Disabled by reason',
      group: 'workspace',
      disabledReason: () => 'No active session',
      run: vi.fn(),
    })

    await expect(executeCommand('test.disabled-reason')).rejects.toThrow('No active session')
  })
})
