import {appendTerminalLines, patchTerminal, terminalState, type TerminalTab} from '../../../entities/terminal'
import {pollTerminalOutput} from '../../../entities/terminal/api/terminalRepository'
import {messages} from '../../../shared/copy'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {notifyTerminalFailure} from '../../../shared/feedback'
import {decodeTextBase64} from '../../../shared/lib/base64'
import type {TerminalOutputEvent as PolledTerminalOutputEvent} from '../../../shared/ipc/ipcContract'
import {listenTypedEvent, type TerminalErrorEvent, type TerminalOutputEvent} from '../../../shared/ipc/ipcEvents'

type TerminalOutputEventPayload = PolledTerminalOutputEvent | string | {data_base64?: string; dataBase64?: string; type?: string}
type EventDisposer = () => void

const defaultPollIntervalMs = 180

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
  let eventDisposer: EventDisposer | null = null
  let eventRegistration: Promise<EventDisposer> | null = null

  async function pollOnce() {
    await Promise.all(terminalState.tabs.map(pollTerminal))
  }

  function start() {
    if (eventDisposer || eventRegistration || pollTimer !== null) return
    if (isTauriRuntime()) {
      eventRegistration = registerTerminalEvents().then((dispose) => {
        eventDisposer = dispose
        eventRegistration = null
        return dispose
      })
      return
    }
    startPollingFallback()
  }

  function stop() {
    eventDisposer?.()
    eventDisposer = null
    if (eventRegistration) {
      void eventRegistration.then((dispose) => dispose())
      eventRegistration = null
    }
    stopPollingFallback()
  }

  function startPollingFallback() {
    if (pollTimer !== null) return
    const setIntervalFn = options.setInterval ?? (typeof window === 'undefined' ? null : window.setInterval.bind(window))
    if (!setIntervalFn) return
    pollTimer = setIntervalFn(pollOnce, intervalMs)
  }

  function stopPollingFallback() {
    if (pollTimer === null) return
    const clearIntervalFn = options.clearInterval ?? (typeof window === 'undefined' ? null : window.clearInterval.bind(window))
    clearIntervalFn?.(pollTimer)
    pollTimer = null
  }

  return {pollOnce, start, stop}
}

async function registerTerminalEvents() {
  const disposers = await Promise.all([
    listenTypedEvent('terminal-output', handleTerminalOutput),
    listenTypedEvent('terminal-closed', handleTerminalClosed),
    listenTypedEvent('terminal-error', handleTerminalError),
  ])
  return () => disposers.forEach((dispose) => dispose())
}

async function pollTerminal(tab: TerminalTab) {
  if (!tab.backendSessionId || tab.status !== 'connected') return
  try {
    const events = await pollTerminalOutput(tab.backendSessionId)
    const lines = events.map(decodeEvent).filter((line) => line.length > 0)
    if (lines.length > 0) appendTerminalLines(tab.id, lines)
  } catch (error) {
    markTerminalOutputFailed(tab, `Output polling failed: ${getErrorMessage(error)}`, getErrorMessage(error))
  }
}

function handleTerminalOutput(event: TerminalOutputEvent) {
  const tab = findTerminalByBackendSessionId(event.sessionId)
  if (!tab) return
  const line = decodeEvent(event)
  if (line) appendTerminalLines(tab.id, [line])
}

function handleTerminalClosed(event: {sessionId: string}) {
  const tab = findTerminalByBackendSessionId(event.sessionId)
  if (!tab) return
  patchTerminal(tab.id, {status: 'disconnected'})
  // 如果关闭的是当前活跃终端，自动切换到第一个可用终端
  if (terminalState.activeTerminalId === tab.id) {
    const fallback = terminalState.tabs.find((t) => t.id !== tab!.id && t.status === 'connected')
    terminalState.activeTerminalId = fallback?.id ?? ''
  }
}

function handleTerminalError(event: TerminalErrorEvent) {
  const tab = findTerminalByBackendSessionId(event.sessionId)
  if (!tab) return
  markTerminalOutputFailed(tab, `Terminal output failed: ${event.error}`, event.error)
}

function findTerminalByBackendSessionId(sessionId: string) {
  return terminalState.tabs.find((tab) => tab.backendSessionId === sessionId)
}

function markTerminalOutputFailed(tab: TerminalTab, line: string, detail: string) {
  patchTerminal(tab.id, {status: 'failed'})
  appendTerminalLines(tab.id, [line])
  if (terminalState.activeTerminalId !== tab.id) {
    notifyTerminalFailure({action: 'output-failed', terminalId: tab.id, title: messages.terminal.failures.outputStopped(tab.title), detail})
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

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean('__TAURI_INTERNALS__' in window)
}
