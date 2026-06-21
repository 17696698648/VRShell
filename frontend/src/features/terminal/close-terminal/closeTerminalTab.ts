import {closeTerminal, getTerminalInputQueueLength, type TerminalTab} from '../../../entities/terminal'
import {requestConfirm} from '../../../shared/dialog'

export async function closeTerminalTab(tab: TerminalTab) {
  if (shouldConfirmClose(tab)) {
    const confirmed = await requestConfirm({
      title: 'Close terminal',
      message: getCloseMessage(tab),
      confirmLabel: 'Close',
      tone: 'danger',
    })
    if (!confirmed) return false
  }
  closeTerminal(tab.id)
  return true
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
