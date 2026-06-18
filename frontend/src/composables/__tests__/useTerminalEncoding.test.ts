import {describe, expect, it} from 'vitest'
import {base64ToString, uint8ToBase64} from '../useTerminalEncoding'

describe('terminal encoding', () => {
  it('round-trips utf-8 text through base64', () => {
    const text = 'hello 终端'
    const bytes = new TextEncoder().encode(text)
    expect(base64ToString(uint8ToBase64(bytes))).toBe(text)
  })

  it('handles large byte arrays in chunks', () => {
    const bytes = new Uint8Array(70000).fill(65)
    expect(base64ToString(uint8ToBase64(bytes))).toHaveLength(70000)
  })
})
