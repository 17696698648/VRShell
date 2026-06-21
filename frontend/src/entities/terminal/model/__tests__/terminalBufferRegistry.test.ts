import {afterEach, describe, expect, it} from 'vitest'
import {appendTerminalBuffer, clearTerminalBuffers, getTerminalBuffer, initializeTerminalBuffer, removeTerminalBuffer} from '../terminalBufferRegistry'

describe('terminalBufferRegistry', () => {
  afterEach(() => clearTerminalBuffers())

  it('initializes and appends buffer lines', () => {
    initializeTerminalBuffer('term', ['one'])
    appendTerminalBuffer('term', ['two', 'three'])

    expect(getTerminalBuffer('term').value).toEqual(['one', 'two', 'three'])
  })

  it('removes terminal buffers', () => {
    initializeTerminalBuffer('term', ['one'])
    removeTerminalBuffer('term')

    expect(getTerminalBuffer('term').value).toEqual([])
  })

  it('keeps only the latest buffered lines', () => {
    initializeTerminalBuffer('term', Array.from({length: 2005}, (_, index) => `line-${index}`))

    expect(getTerminalBuffer('term').value).toHaveLength(2000)
    expect(getTerminalBuffer('term').value[0]).toBe('line-5')
  })
})
