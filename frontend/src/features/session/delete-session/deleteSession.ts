import {removeSession, type SessionHost} from '../../../entities/session'
import {terminalState, closeTerminal} from '../../../entities/terminal'
import {requestConfirm} from '../../../shared/dialog'

export async function confirmDeleteSession(session: SessionHost) {
  const confirmed = await requestConfirm({
    title: 'Delete session',
    message: `Delete ${session.name}? Related terminal tabs will be closed.`,
    confirmLabel: 'Delete',
    tone: 'danger',
  })
  if (confirmed) deleteSession(session.id)
}

export function deleteSession(sessionId: string) {
  for (const tab of [...terminalState.tabs]) {
    if (tab.sessionId === sessionId) closeTerminal(tab.id)
  }
  removeSession(sessionId)
}
