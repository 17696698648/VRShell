import {afterEach, describe, expect, it} from 'vitest'
import {clearTerminalInputQueues, drainTerminalInputQueue, enqueueTerminalInput, getTerminalInputQueueLength} from '../terminalInputQueue'

describe('terminalInputQueue', () => {
  afterEach(() => clearTerminalInputQueues())

  it('queues and drains input in order', () => {
    enqueueTerminalInput('term', 'one')
    enqueueTerminalInput('term', 'two')

    expect(getTerminalInputQueueLength('term')).toBe(2)
    expect(drainTerminalInputQueue('term')).toEqual(['one', 'two'])
    expect(getTerminalInputQueueLength('term')).toBe(0)
  })
})
