export type TerminalInputQueueOptions = {
  getSessionId: () => string | null
  getBroadcastSessionIds: () => string[]
  sendInput: (sessionId: string, text: string) => Promise<void>
  onError: (message: string) => void
  onDebug?: (context: string, error: unknown) => void
  maxPendingChars?: number
  flushDelayMs?: number
}

export function useTerminalInputQueue({
  getSessionId,
  getBroadcastSessionIds,
  sendInput,
  onError,
  onDebug,
  maxPendingChars = 1024 * 1024,
  flushDelayMs = 8,
}: TerminalInputQueueOptions) {
  let inputFlushTimer: number | null = null
  let pendingInput = ''

  function getTargetSessionIds() {
    const currentSessionId = getSessionId()
    if (!currentSessionId) return []
    return Array.from(new Set([currentSessionId, ...getBroadcastSessionIds()])).filter((id) => id !== '')
  }

  async function flushPendingInput() {
    inputFlushTimer = null
    const text = pendingInput
    pendingInput = ''
    if (!text) return

    const [primarySessionId, ...broadcastSessionIds] = getTargetSessionIds()
    if (!primarySessionId) return

    try {
      await sendInput(primarySessionId, text)
      for (const sid of broadcastSessionIds) {
        sendInput(sid, text).catch((error) => onDebug?.('broadcast input failed', error))
      }
    } catch (error) {
      onError(`send error: ${error}`)
    }
  }

  function queueTerminalInput(data: string) {
    if (!getSessionId()) return
    if (pendingInput.length + data.length > maxPendingChars) {
      pendingInput = ''
      onError('send error: terminal input queue limit exceeded')
      return
    }

    pendingInput += data
    if (inputFlushTimer === null) {
      inputFlushTimer = window.setTimeout(() => {
        void flushPendingInput()
      }, flushDelayMs)
    }
  }

  function clearInputQueue() {
    if (inputFlushTimer !== null) {
      window.clearTimeout(inputFlushTimer)
      inputFlushTimer = null
    }
    pendingInput = ''
  }

  return {
    queueTerminalInput,
    flushPendingInput,
    clearInputQueue,
    getTargetSessionIds,
  }
}
