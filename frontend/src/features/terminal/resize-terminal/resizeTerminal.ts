import type {TerminalTab} from '../../../entities/terminal'
import {resizeTerminalPty} from '../../../entities/terminal/api/terminalRepository'
import {pushToast} from '../../../shared/feedback'

const charWidthPx = 9
const lineHeightPx = 22
const minCols = 20
const minRows = 4
const debounceMs = 120
const timers = new Map<string, ReturnType<typeof window.setTimeout>>()

export interface TerminalViewportSize {
  height: number
  width: number
}

export function scheduleTerminalResize(tab: TerminalTab, size: TerminalViewportSize) {
  if (!tab.backendSessionId) return
  const existing = timers.get(tab.id)
  if (existing) window.clearTimeout(existing)
  timers.set(tab.id, window.setTimeout(() => {
    timers.delete(tab.id)
    void resizeTerminal(tab, size)
  }, debounceMs))
}

export async function resizeTerminal(tab: TerminalTab, size: TerminalViewportSize) {
  const dimensions = getTerminalDimensions(size)
  try {
    await resizeTerminalPty(tab.backendSessionId, dimensions.cols, dimensions.rows)
  } catch (error) {
    pushToast({level: 'error', title: `Failed to resize ${tab.title}`, detail: getErrorMessage(error)})
  }
}

export function getTerminalDimensions(size: TerminalViewportSize) {
  return {
    cols: Math.max(minCols, Math.floor(size.width / charWidthPx)),
    rows: Math.max(minRows, Math.floor(size.height / lineHeightPx)),
  }
}

export function clearTerminalResizeTimers() {
  for (const timer of timers.values()) window.clearTimeout(timer)
  timers.clear()
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
