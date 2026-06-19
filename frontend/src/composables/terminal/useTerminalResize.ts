import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'

export function useTerminalResize({
  getSessionId,
  getTerminal,
  getFitAddon,
  sendResize,
}: {
  getSessionId: () => string | null
  getTerminal: () => Terminal | null
  getFitAddon: () => FitAddon | null
  sendResize: (cols: number, rows: number) => Promise<void>
}) {
  let fitAndResizeTimer: number | null = null
  let lastSize: { cols: number; rows: number } | null = null

  function clearResizeTimer() {
    if (fitAndResizeTimer) {
      window.clearTimeout(fitAndResizeTimer)
      fitAndResizeTimer = null
    }
  }

  function resetLastSize() {
    lastSize = null
  }

  function scheduleFitAndResize() {
    clearResizeTimer()
    fitAndResizeTimer = window.setTimeout(() => {
      fitAndResizeTimer = null
      try {
        const fit = getFitAddon()
        const term = getTerminal()
        fit?.fit()
        if (term) {
          term.refresh(0, term.rows - 1)
        }
        void sendCurrentSize()
      } catch {
      }
    }, 60)
  }

  async function sendCurrentSize() {
    if (!getSessionId()) return

    const term = getTerminal()
    const cols = term?.cols ?? 80
    const rows = term?.rows ?? 24
    if (lastSize?.cols === cols && lastSize.rows === rows) {
      return
    }

    lastSize = { cols, rows }
    await sendResize(cols, rows)
  }

  return {
    clearResizeTimer,
    resetLastSize,
    scheduleFitAndResize,
    sendCurrentSize,
  }
}
