import {appendTerminalLines, patchTerminal, terminalState, type TerminalTab} from '../../../entities/terminal'
import {patchSession} from '../../../entities/session'
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
  scheduleOutputFlush?: (callback: () => void) => number
  cancelOutputFlush?: (handle: number) => void
}

export interface TerminalEventProvider {
  start: () => void
  stop: () => void
  pollOnce: () => Promise<void>
  flushOutput: () => void
}

export function createTerminalEventProvider(options: TerminalEventProviderOptions = {}): TerminalEventProvider {
  const intervalMs = options.pollIntervalMs ?? defaultPollIntervalMs
  let pollTimer: ReturnType<typeof window.setInterval> | null = null
  let eventDisposer: EventDisposer | null = null
  let eventRegistration: Promise<EventDisposer> | null = null
  const outputBatcher = createTerminalOutputBatcher(options)

  async function pollOnce() {
    await Promise.all(terminalState.tabs.map(pollTerminal))
  }

  function start() {
    if (eventDisposer || eventRegistration || pollTimer !== null) return
    if (isTauriRuntime()) {
      eventRegistration = registerTerminalEvents(outputBatcher).then((dispose) => {
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
    outputBatcher.cancel()
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

  return {flushOutput: outputBatcher.flush, pollOnce, start, stop}
}

async function registerTerminalEvents(outputBatcher: TerminalOutputBatcher) {
  const disposers = await Promise.all([
    listenTypedEvent('terminal-output', (event) => handleTerminalOutput(event, outputBatcher)),
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

function handleTerminalOutput(event: TerminalOutputEvent, outputBatcher: TerminalOutputBatcher) {
  const tab = findTerminalByBackendSessionId(event.sessionId)
  if (!tab) return
  const line = decodeEvent(event)
  if (line) outputBatcher.enqueue(tab.id, line)
}

interface TerminalOutputBatcher {
  enqueue: (tabId: string, line: string) => void
  flush: () => void
  cancel: () => void
}

export function createTerminalOutputBatcher(options: TerminalEventProviderOptions = {}): TerminalOutputBatcher {
  const pendingLines = new Map<string, string[]>()
  const scheduleFlush = options.scheduleOutputFlush ?? defaultScheduleOutputFlush
  const cancelFlush = options.cancelOutputFlush ?? defaultCancelOutputFlush
  let scheduledHandle: number | null = null

  function enqueue(tabId: string, line: string) {
    const lines = pendingLines.get(tabId) ?? []
    lines.push(line)
    pendingLines.set(tabId, lines)
    schedule()
  }

  function schedule() {
    if (scheduledHandle !== null) return
    scheduledHandle = scheduleFlush(flush)
  }

  function flush() {
    scheduledHandle = null
    for (const [tabId, lines] of pendingLines) {
      appendTerminalLines(tabId, lines)
    }
    pendingLines.clear()
  }

  function cancel() {
    if (scheduledHandle !== null) cancelFlush(scheduledHandle)
    scheduledHandle = null
    pendingLines.clear()
  }

  return {cancel, enqueue, flush}
}

function defaultScheduleOutputFlush(callback: () => void) {
  if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
    return window.requestAnimationFrame(callback)
  }
  return setTimeout(callback, 16) as unknown as number
}

function defaultCancelOutputFlush(handle: number) {
  if (typeof window !== 'undefined' && 'cancelAnimationFrame' in window) {
    window.cancelAnimationFrame(handle)
    return
  }
  clearTimeout(handle)
}

function handleTerminalClosed(event: {sessionId: string}) {
  const tab = findTerminalByBackendSessionId(event.sessionId)
  if (!tab) return
  patchTerminal(tab.id, {status: 'disconnected'})
  patchSession(tab.sessionId, {status: 'idle', backendSessionId: undefined})
  // 如果关闭的是当前活跃终端，自动切换到第一个可用终端
  if (terminalState.activeTerminalId === tab.id) {
    const fallback = terminalState.tabs.find((t) => t.id !== tab!.id && t.status === 'connected')
    terminalState.activeTerminalId = fallback?.id ?? ''
  }
}

export function handleTerminalError(event: TerminalErrorEvent) {
  const tab = findTerminalByBackendSessionId(event.sessionId)
  if (!tab) return
  markTerminalOutputFailed(tab, `Terminal output failed: ${event.error}`, event.error)
}

function findTerminalByBackendSessionId(sessionId: string) {
  return terminalState.tabs.find((tab) => tab.backendSessionId === sessionId)
}

function markTerminalOutputFailed(tab: TerminalTab, line: string, detail: string) {
  patchTerminal(tab.id, {status: 'failed'})
  patchSession(tab.sessionId, {status: 'failed', backendSessionId: undefined})
  appendTerminalLines(tab.id, [line])
  if (terminalState.activeTerminalId !== tab.id || isConnectionLostMessage(detail)) {
    notifyTerminalFailure({action: 'output-failed', terminalId: tab.id, title: messages.terminal.failures.outputStopped(tab.title), detail})
  }
}

function isConnectionLostMessage(message: string) {
  return /connection lost|keepalive failed|unable to send window-change packet|session\(-7\)/i.test(message)
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
