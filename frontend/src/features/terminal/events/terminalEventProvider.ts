import {appendTerminalLines, patchTerminal, terminalState, type TerminalTab} from '../../../entities/terminal'
import {pollTerminalOutput} from '../../../entities/terminal/api/terminalRepository'
import {pushToast} from '../../../shared/feedback'
import {decodeTextBase64} from '../../../shared/lib/base64'
import type {TerminalOutputEvent} from '../../../shared/ipc/ipcContract'

type TerminalOutputEventPayload = TerminalOutputEvent | string | {data_base64?: string; dataBase64?: string; type?: string}

const defaultPollIntervalMs = 1200

export interface TerminalEventProviderOptions {
  pollIntervalMs?: number
  setInterval?: typeof window.setInterval
  clearInterval?: typeof window.clearInterval
}

export interface TerminalEventProvider {
  start: () => void
  stop: () => void
  pollOnce: () => Promise<void>
}

export function createTerminalEventProvider(options: TerminalEventProviderOptions = {}): TerminalEventProvider {
  const intervalMs = options.pollIntervalMs ?? defaultPollIntervalMs
  let pollTimer: ReturnType<typeof window.setInterval> | null = null

  async function pollOnce() {
    await Promise.all(terminalState.tabs.map(pollTerminal))
  }

  function start() {
    if (pollTimer !== null) return
    const setIntervalFn = options.setInterval ?? (typeof window === 'undefined' ? null : window.setInterval.bind(window))
    if (!setIntervalFn) return
    pollTimer = setIntervalFn(pollOnce, intervalMs)
  }

  function stop() {
    if (pollTimer === null) return
    const clearIntervalFn = options.clearInterval ?? (typeof window === 'undefined' ? null : window.clearInterval.bind(window))
    clearIntervalFn?.(pollTimer)
    pollTimer = null
  }

  return {pollOnce, start, stop}
}

async function pollTerminal(tab: TerminalTab) {
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

function decodeEvent(event: TerminalOutputEventPayload) {
  const payload = typeof event === 'string' ? event : event.dataBase64 ?? ('data_base64' in event ? event.data_base64 : '') ?? ''
  if (!payload) return ''
  try {
    return decodeTextBase64(payload)
  } catch {
    return payload
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
