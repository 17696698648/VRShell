import {describe, expect, it} from 'vitest'
import {isCurrentTerminalMessage, normalizeTerminalMessage} from '../terminalMessages'

describe('terminalMessages', () => {
  it('normalizes snake and camel session ids', () => {
    expect(normalizeTerminalMessage({session_id: 'a', message: 'one'}).sessionId).toBe('a')
    expect(normalizeTerminalMessage({sessionId: 'b', message: 'two'}).sessionId).toBe('b')
  })

  it('checks message ownership', () => {
    expect(isCurrentTerminalMessage({session_id: 'a'}, 'a')).toBe(true)
    expect(isCurrentTerminalMessage({session_id: 'a'}, 'b')).toBe(false)
    expect(isCurrentTerminalMessage('plain', 'b')).toBe(true)
  })
})
