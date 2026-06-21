import {afterEach, describe, expect, it, vi} from 'vitest'
import {clearCommands, registerCommand} from '../../command-registry'
import {registerGlobalShortcuts} from '../globalShortcuts'

describe('registerGlobalShortcuts', () => {
  afterEach(() => {
    clearCommands()
    vi.unstubAllGlobals()
  })

  it('executes registered command shortcuts', () => {
    const listeners = new Map<string, EventListener>()
    const run = vi.fn()
    vi.stubGlobal('window', {
      addEventListener: (type: string, listener: EventListener) => listeners.set(type, listener),
      removeEventListener: (type: string) => listeners.delete(type),
    })
    registerCommand({id: 'workspace.test', title: 'Test', group: 'workspace', shortcut: 'Ctrl+P', run})

    const dispose = registerGlobalShortcuts()
    listeners.get('keydown')?.({ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: 'p', preventDefault: vi.fn()} as unknown as KeyboardEvent)

    expect(run).toHaveBeenCalledOnce()
    dispose()
    expect(listeners.has('keydown')).toBe(false)
  })
})
