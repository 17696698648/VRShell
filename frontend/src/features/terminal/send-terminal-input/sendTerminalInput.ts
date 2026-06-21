import {terminalState, appendTerminalLines, drainTerminalInputQueue, enqueueTerminalInput, patchTerminal, type TerminalTab} from '../../../entities/terminal'
import {sendTerminalInput as sendTerminalInputRepository} from '../../../entities/terminal/api/terminalRepository'
import {pushToast} from '../../../shared/feedback'
import {encodeTextBase64} from '../../../shared/lib/base64'

export async function sendInputToActiveTerminal(input: string) {
  const tab = terminalState.tabs.find((item) => item.id === terminalState.activeTerminalId)
  if (!tab || !input) return
  appendTerminalLines(tab.id, [`${tab.cwd}$ ${input}`])
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
  try {
    await sendTerminalInputRepository(tab.backendSessionId, encodeTextBase64(`${input}\n`))
  } catch (error) {
    patchTerminal(tab.id, {status: 'failed'})
    appendTerminalLines(tab.id, [`Input failed: ${getErrorMessage(error)}`])
    pushToast({level: 'error', title: `Failed to send input to ${tab.title}`, detail: getErrorMessage(error)})
    throw error
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
