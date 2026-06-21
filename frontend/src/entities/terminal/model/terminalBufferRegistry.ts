import {shallowRef, type ShallowRef} from 'vue'

const maxBufferedLines = 2000
const buffers = new Map<string, ShallowRef<string[]>>()

export function getTerminalBuffer(tabId: string) {
  let buffer = buffers.get(tabId)
  if (!buffer) {
    buffer = shallowRef<string[]>([])
    buffers.set(tabId, buffer)
  }
  return buffer
}

export function initializeTerminalBuffer(tabId: string, lines: string[]) {
  getTerminalBuffer(tabId).value = trimLines(lines)
}

export function appendTerminalBuffer(tabId: string, lines: string[]) {
  if (lines.length === 0) return
  const buffer = getTerminalBuffer(tabId)
  buffer.value = trimLines([...buffer.value, ...lines])
}

export function removeTerminalBuffer(tabId: string) {
  buffers.delete(tabId)
}

export function clearTerminalBuffers() {
  buffers.clear()
}

function trimLines(lines: string[]) {
  if (lines.length <= maxBufferedLines) return [...lines]
  return lines.slice(lines.length - maxBufferedLines)
}
