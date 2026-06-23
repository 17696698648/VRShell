import {patchSession, setActiveSession} from '../../../entities/session'
import {connectTerminal} from '../../../entities/terminal/api/terminalRepository'
import {openTerminal} from '../../../entities/terminal'
import type {SessionHost} from '../../../entities/session'
import {pushToast} from '../../../shared/feedback'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {resolveSessionAuth} from '../manage-credentials/sessionCredentials'

export async function connectSession(session: SessionHost) {
  setActiveSession(session.id)
  patchSession(session.id, {status: 'connecting'})
  try {
    const auth = await resolveSessionAuth(session.auth, session.id)
    const resolvedSession = {...session, auth}
    const backendSessionId = await connectTerminal(resolvedSession)
    patchSession(session.id, {status: 'connected', backendSessionId})
    openTerminal({
      id: `term-${session.id}`,
      sessionId: session.id,
      backendSessionId,
      title: session.name,
      status: 'connected',
      cwd: '~',
      lines: [`Connecting to ${session.username}@${session.host}:${session.port}...`],
    })
  } catch (error) {
    patchSession(session.id, {status: 'failed'})
    pushToast({level: 'error', title: `Failed to connect ${session.name}`, detail: getErrorMessage(error)})
    throw error
  }
}
