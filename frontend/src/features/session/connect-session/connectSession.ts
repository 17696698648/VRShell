import {patchSession, setActiveSession} from '../../../entities/session'
import {connectTerminal} from '../../../entities/terminal/api/terminalRepository'
import {openTerminal} from '../../../entities/terminal'
import type {SessionHost} from '../../../entities/session'
import {pushToast} from '../../../shared/feedback'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'

export async function connectSession(session: SessionHost) {
  setActiveSession(session.id)
  patchSession(session.id, {status: 'connecting'})
  try {
    const backendSessionId = await connectTerminal(session)
    patchSession(session.id, {status: 'connected', backendSessionId})
    openTerminal({
      id: `term-${session.id}`,
      sessionId: session.id,
      backendSessionId,
      title: session.name,
      status: 'connected',
      cwd: '/home/' + session.username,
      lines: [`$ ssh ${session.username}@${session.host}`, `Connected to ${session.name}`, `${session.username}@${session.name}:~$`],
    })
  } catch (error) {
    patchSession(session.id, {status: 'failed'})
    pushToast({level: 'error', title: `Failed to connect ${session.name}`, detail: getErrorMessage(error)})
    throw error
  }
}
