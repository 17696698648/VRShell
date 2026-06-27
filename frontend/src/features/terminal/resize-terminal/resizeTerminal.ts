import type {TerminalTab} from '../../../entities/terminal'
import {resizeTerminalPty} from '../../../entities/terminal/api/terminalRepository'
import {messages} from '../../../shared/copy'
import {notifyTerminalFailure, notifyWarning} from '../../../shared/feedback'

const charWidthPx = 9
const lineHeightPx = 22
const minCols = 20
const minRows = 4
const debounceMs = 120
const timers = new Map<string, ReturnType<typeof window.setTimeout>>()
const pendingDimensions = new Map<string, {cols: number; rows: number}>()
const lastSentDimensions = new Map<string, {cols: number; rows: number}>()

export interface TerminalViewportSize {
  cols?: number
  height?: number
  rows?: number
  width?: number
}

export function scheduleTerminalResize(tab: TerminalTab, size: TerminalViewportSize) {
  if (!tab.backendSessionId || typeof window === 'undefined') return
  const dimensions = getTerminalDimensions(size)
  if (isSameDimensions(dimensions, lastSentDimensions.get(tab.id))) return
  pendingDimensions.set(tab.id, dimensions)
  const existing = timers.get(tab.id)
  if (existing) window.clearTimeout(existing)
  timers.set(tab.id, window.setTimeout(() => {
    timers.delete(tab.id)
    const latestDimensions = pendingDimensions.get(tab.id)
    pendingDimensions.delete(tab.id)
    if (latestDimensions) void resizeTerminal(tab, latestDimensions)
  }, debounceMs))
}

export async function resizeTerminal(tab: TerminalTab, size: TerminalViewportSize) {
  const dimensions = getTerminalDimensions(size)
  if (isSameDimensions(dimensions, lastSentDimensions.get(tab.id))) return
  try {
    await resizeTerminalPty(tab.backendSessionId, dimensions.cols, dimensions.rows)
    lastSentDimensions.set(tab.id, dimensions)
  } catch (error) {
    notifyTerminalFailure({action: 'resize-failed', terminalId: tab.id, title: messages.terminal.failures.resize(tab.title), error})
  }
}

export function getTerminalDimensions(size: TerminalViewportSize) {
  if (typeof size.cols === 'number' && typeof size.rows === 'number') {
    return {
      cols: Math.max(minCols, Math.floor(size.cols)),
      rows: Math.max(minRows, Math.floor(size.rows)),
    }
  }
  return {
    cols: Math.max(minCols, Math.floor((size.width ?? 0) / charWidthPx)),
    rows: Math.max(minRows, Math.floor((size.height ?? 0) / lineHeightPx)),
  }
}

export function clearTerminalResizeTimers() {
  for (const timer of timers.values()) window.clearTimeout(timer)
  timers.clear()
  pendingDimensions.clear()
  lastSentDimensions.clear()
}

function isSameDimensions(left: {cols: number; rows: number}, right?: {cols: number; rows: number}) {
  return left.cols === right?.cols && left.rows === right.rows
}
