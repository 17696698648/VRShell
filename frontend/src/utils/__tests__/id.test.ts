import {describe, expect, it, vi} from 'vitest'
import {createId} from '../id'

describe('createId', () => {
  it('prefixes generated ids', () => {
    expect(createId('task').startsWith('task-')).toBe(true)
  })

  it('uses randomUUID when available', () => {
    const originalCrypto = globalThis.crypto
    vi.stubGlobal('crypto', {randomUUID: () => 'uuid-value'})
    expect(createId('session')).toBe('session-uuid-value')
    vi.stubGlobal('crypto', originalCrypto)
  })
})
