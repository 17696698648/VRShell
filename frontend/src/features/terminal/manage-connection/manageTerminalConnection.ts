import {patchSession, sessionState} from '../../../entities/session'
import {patchTerminal, type TerminalTab} from '../../../entities/terminal'
import {disconnectTerminal} from '../../../entities/terminal/api/terminalRepository'
import {connectSession} from '../../session/connect-session/connectSession'
import {flushTerminalInputQueue} from '../send-terminal-input/sendTerminalInput'
import {messages} from '../../../shared/copy'
import {notifyTerminalFailure, notifyWarning} from '../../../shared/feedback'

export async function disconnectTerminalTab(tab: TerminalTab) {
  try {
    await disconnectTerminal(tab.backendSessionId)
    patchTerminal(tab.id, {status: 'disconnected'})
    patchSession(tab.sessionId, {status: 'idle', backendSessionId: undefined})
  } catch (error) {
    patchTerminal(tab.id, {status: 'failed'})
    notifyTerminalFailure({action: 'disconnect-failed', terminalId: tab.id, title: messages.terminal.failures.disconnect(tab.title), detail: getErrorMessage(error)})
    throw error
  }
}

export async function reconnectTerminalTab(tab: TerminalTab) {
  const session = sessionState.sessions.find((item) => item.id === tab.sessionId)
  if (!session) throw new Error(`Session not found: ${tab.sessionId}`)
  patchTerminal(tab.id, {status: 'connecting'})
  await connectSession(session)
  await flushTerminalInputQueue(tab)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}



