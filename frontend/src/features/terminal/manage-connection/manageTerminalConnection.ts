import {patchSession, sessionState} from '../../../entities/session'
import {patchTerminal, type TerminalTab} from '../../../entities/terminal'
import {connectTerminal, disconnectTerminal} from '../../../entities/terminal/api/terminalRepository'
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
    notifyTerminalFailure({action: 'disconnect-failed', terminalId: tab.id, title: messages.terminal.failures.disconnect(tab.title), error})
    throw error
  }
}

export async function reconnectTerminalTab(tab: TerminalTab) {
  const session = sessionState.sessions.find((item) => item.id === tab.sessionId)
  if (!session) throw new Error(`Session not found: ${tab.sessionId}`)
  patchTerminal(tab.id, {status: 'connecting'})
  patchSession(tab.sessionId, {status: 'connecting', backendSessionId: undefined})
  try {
    const backendSessionId = await connectTerminal(session)
    patchSession(tab.sessionId, {status: 'connected', backendSessionId})
    patchTerminal(tab.id, {backendSessionId, status: 'connected'})
    await flushTerminalInputQueue({...tab, backendSessionId, status: 'connected'})
  } catch (error) {
    patchTerminal(tab.id, {status: 'failed'})
    patchSession(tab.sessionId, {status: 'failed', backendSessionId: undefined})
    notifyTerminalFailure({action: 'reconnect-failed', terminalId: tab.id, title: messages.terminal.failures.open, error})
    throw error
  }
}
