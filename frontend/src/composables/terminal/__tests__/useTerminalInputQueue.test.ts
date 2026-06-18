import {describe, expect, it, vi} from 'vitest'
import {useTerminalInputQueue} from '../useTerminalInputQueue'

describe('useTerminalInputQueue', () => {
  it('deduplicates primary and broadcast targets', () => {
    const queue = useTerminalInputQueue({
      getSessionId: () => 'main',
      getBroadcastSessionIds: () => ['main', 'other', 'other'],
      sendInput: vi.fn(),
      onError: vi.fn(),
    })

    expect(queue.getTargetSessionIds()).toEqual(['main', 'other'])
  })

  it('rejects oversized pending input', () => {
    const onError = vi.fn()
    const sendInput = vi.fn()
    const queue = useTerminalInputQueue({
      getSessionId: () => 'main',
      getBroadcastSessionIds: () => [],
      sendInput,
      onError,
      maxPendingChars: 3,
    })

    queue.queueTerminalInput('abcd')
    expect(onError).toHaveBeenCalledWith('send error: terminal input queue limit exceeded')
    expect(sendInput).not.toHaveBeenCalled()
  })
})
