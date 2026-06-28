import {patchSession, setActiveSession} from '../../../entities/session'
import {connectTerminal} from '../../../entities/terminal/api/terminalRepository'
import {openTerminal} from '../../../entities/terminal'
import type {SessionHost} from '../../../entities/session'
import {workspaceState} from '../../../entities/workspace'
import {notifyAppError} from '../../../shared/feedback'
import {resolveSessionAuth} from '../manage-credentials/sessionCredentials'
import {messages} from '../../../shared/copy'

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
    workspaceState.activeRightPanel = 'sftp'
    workspaceState.recentRightPanel = 'sftp'
    workspaceState.rightPanelVisible = true
  } catch (error) {
    patchSession(session.id, {status: 'failed'})
    notifyAppError(error, {title: messages.session.failures.connect(session.name), action: 'connect-session', dedupeKey: `session:${session.id}:connect`})
    throw error
  }
}
