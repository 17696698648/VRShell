export function throttle<TArgs extends unknown[]>(callback: (...args: TArgs) => void, intervalMs: number) {
  let lastRun = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  return (...args: TArgs) => {
    const now = Date.now()
    const remaining = intervalMs - (now - lastRun)

    if (remaining <= 0) {
      if (timer) clearTimeout(timer)
      timer = undefined
      lastRun = now
      callback(...args)
      return
    }

    if (!timer) {
      timer = setTimeout(() => {
        timer = undefined
        lastRun = Date.now()
        callback(...args)
      }, remaining)
    }
  }
}
