const sendChains = new Map<string, Promise<void>>()

export function enqueueTerminalSend(tabId: string, send: () => Promise<void>) {
  const previous = sendChains.get(tabId) ?? Promise.resolve()
  const next = previous.then(send, send)
  sendChains.set(tabId, next)
  return next.finally(() => {
    if (sendChains.get(tabId) === next) sendChains.delete(tabId)
  })
}

export function clearTerminalSendChains(tabId?: string) {
  if (tabId) sendChains.delete(tabId)
  else sendChains.clear()
}

export function getTerminalSendChainCount() {
  return sendChains.size
}
