const queues = new Map<string, string[]>()

export function enqueueTerminalInput(tabId: string, input: string) {
  const queue = getQueue(tabId)
  queue.push(input)
  return queue.length
}

export function drainTerminalInputQueue(tabId: string) {
  const queue = getQueue(tabId)
  const inputs = [...queue]
  queues.set(tabId, [])
  return inputs
}

export function getTerminalInputQueueLength(tabId: string) {
  return getQueue(tabId).length
}

export function clearTerminalInputQueue(tabId: string) {
  queues.delete(tabId)
}

export function clearTerminalInputQueues() {
  queues.clear()
}

function getQueue(tabId: string) {
  let queue = queues.get(tabId)
  if (!queue) {
    queue = []
    queues.set(tabId, queue)
  }
  return queue
}
