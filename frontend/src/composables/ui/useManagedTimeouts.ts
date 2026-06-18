export function useManagedTimeouts() {
  const timers = new Set<number>()

  function setManagedTimeout(callback: () => void, delay: number) {
    const timer = window.setTimeout(() => {
      timers.delete(timer)
      callback()
    }, delay)
    timers.add(timer)
    return timer
  }

  function clearManagedTimeouts() {
    for (const timer of timers) {
      window.clearTimeout(timer)
    }
    timers.clear()
  }

  return {setManagedTimeout, clearManagedTimeouts}
}
