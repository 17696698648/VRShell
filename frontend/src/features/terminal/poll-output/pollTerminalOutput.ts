import {terminalState, appendTerminalLines, patchTerminal} from '../../../entities/terminal'
import {pollTerminalOutput} from '../../../entities/terminal/api/terminalRepository'
import {pushToast} from '../../../shared/feedback'
import {decodeTextBase64} from '../../../shared/lib/base64'

const pollIntervalMs = 1200
let pollTimer: ReturnType<typeof window.setInterval> | null = null

export function startTerminalOutputPolling() {
  if (typeof window === 'undefined' || pollTimer !== null) return
  pollTimer = window.setInterval(pollAllTerminals, pollIntervalMs)
}

export function stopTerminalOutputPolling() {
  if (pollTimer === null) return
  window.clearInterval(pollTimer)
  pollTimer = null
}

async function pollAllTerminals() {
  await Promise.all(terminalState.tabs.map(pollTerminal))
}

async function pollTerminal(tab: (typeof terminalState.tabs)[number]) {
  if (!tab.backendSessionId || tab.status !== 'connected') return
  try {
    const events = await pollTerminalOutput(tab.backendSessionId)
    const lines = events.map(decodeEvent).filter((line) => line.length > 0)
    if (lines.length > 0) appendTerminalLines(tab.id, lines)
  } catch (error) {
    patchTerminal(tab.id, {status: 'failed'})
    appendTerminalLines(tab.id, [`Output polling failed: ${getErrorMessage(error)}`])
    pushToast({level: 'error', title: `Terminal output stopped for ${tab.title}`, detail: getErrorMessage(error)})
  }
}

function decodeEvent(event: string) {
  try {
    return decodeTextBase64(event)
  } catch {
    return event
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
