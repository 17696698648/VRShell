import {terminalState, appendTerminalLines, drainTerminalInputQueue, enqueueTerminalInput, enqueueTerminalSend, patchTerminal, type TerminalTab} from '../../../entities/terminal'
import {sendTerminalInput as sendTerminalInputRepository} from '../../../entities/terminal/api/terminalRepository'
import {messages} from '../../../shared/copy'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {notifyTerminalFailure, notifyWarning} from '../../../shared/feedback'
import {encodeTextBase64} from '../../../shared/lib/base64'

export async function sendInputToActiveTerminal(input: string) {
  const tab = terminalState.tabs.find((item) => item.id === terminalState.activeTerminalId)
  if (!tab || !input) return
  if (tab.status !== 'connected') {
    const queuedCount = enqueueTerminalInput(tab.id, input)
    appendTerminalLines(tab.id, [`Queued input (${queuedCount} pending) until terminal reconnects.`])
    return
  }
  await sendInputToTerminalTab(tab, input)
}

export async function flushTerminalInputQueue(tab: TerminalTab) {
  if (tab.status !== 'connected') return
  const inputs = drainTerminalInputQueue(tab.id)
  for (const input of inputs) {
    await sendInputToTerminalTab(tab, input)
  }
}

export async function sendInputToTerminalTab(tab: TerminalTab, input: string) {
  return sendTerminalDataToTerminalTab(tab, `${input}\n`)
}

export async function sendTerminalDataToTerminalTab(tab: TerminalTab, data: string) {
  return enqueueTerminalSend(tab.id, () => sendTerminalDataNow(tab, data))
}

async function sendTerminalDataNow(tab: TerminalTab, data: string) {
  const latestTab = terminalState.tabs.find((item) => item.id === tab.id)
  if (!latestTab || latestTab.backendSessionId !== tab.backendSessionId) return
  try {
    await sendTerminalInputRepository(latestTab.backendSessionId, encodeTextBase64(data))
  } catch (error) {
    if (!terminalState.tabs.some((item) => item.id === tab.id && item.backendSessionId === latestTab.backendSessionId)) return
    patchTerminal(tab.id, {status: 'failed'})
    appendTerminalLines(tab.id, [`Input failed: ${getErrorMessage(error)}`])
    notifyTerminalFailure({action: 'send-input-failed', terminalId: tab.id, title: messages.terminal.failures.sendInput(tab.title), error})
    throw error
  }
}
