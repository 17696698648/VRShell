import {closeTerminal, getTerminalInputQueueLength, type TerminalTab} from '../../../entities/terminal'
import {disconnectTerminal} from '../../../entities/terminal/api/terminalRepository'
import {requestConfirm} from '../../../shared/dialog'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {notifyTerminalFailure, notifyWarning} from '../../../shared/feedback'

interface CloseTerminalTabOptions {
  skipConfirm?: boolean
}

export async function closeTerminalTab(tab: TerminalTab, options: CloseTerminalTabOptions = {}) {
  if (!options.skipConfirm && shouldConfirmClose(tab)) {
    const confirmed = await requestConfirm({
      title: 'Close terminal',
      message: getCloseMessage(tab),
      confirmLabel: 'Close',
      tone: 'danger',
    })
    if (!confirmed) return false
  }
  const backendSessionId = tab.backendSessionId
  closeTerminal(tab.id)
  disconnectClosedTerminal(tab, backendSessionId)
  return true
}

function disconnectClosedTerminal(tab: TerminalTab, backendSessionId: string) {
  if (!backendSessionId) return
  void disconnectTerminal(backendSessionId).catch((error) => {
    notifyWarning({title: `Failed to disconnect ${tab.title}`, detail: getErrorMessage(error), dedupeKey: `terminal:${tab.id}:disconnect-warning`})
  })
}

function shouldConfirmClose(tab: TerminalTab) {
  return tab.status === 'connected' || tab.status === 'connecting' || getTerminalInputQueueLength(tab.id) > 0
}

function getCloseMessage(tab: TerminalTab) {
  const queuedCount = getTerminalInputQueueLength(tab.id)
  if (queuedCount > 0) return `Close ${tab.title}? ${queuedCount} queued input item(s) will be discarded.`
  if (tab.status === 'connecting') return `Close ${tab.title} while it is still connecting?`
  return `Close connected terminal ${tab.title}?`
}
