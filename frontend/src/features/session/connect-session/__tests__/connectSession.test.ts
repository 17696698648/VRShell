import {afterEach, describe, expect, it} from 'vitest'
import {sessionState} from '../../../../entities/session'
import {terminalState} from '../../../../entities/terminal'
import {workspaceState} from '../../../../entities/workspace'
import {createSession} from '../../create-session/createSession'
import {connectSession} from '../connectSession'

const originalWorkspaceState = JSON.parse(JSON.stringify(workspaceState)) as typeof workspaceState

describe('connectSession', () => {
  afterEach(() => {
    Object.assign(workspaceState, JSON.parse(JSON.stringify(originalWorkspaceState)))
  })

  it('opens a terminal tab through the repository flow', async () => {
    const session = createSession('vitest-session')
    await connectSession(session)

    expect(sessionState.activeSessionId).toBe(session.id)
    expect(sessionState.sessions.find((item) => item.id === session.id)?.status).toBe('connected')
    expect(terminalState.tabs.some((tab) => tab.sessionId === session.id && tab.backendSessionId)).toBe(true)
    expect(workspaceState.activeRightPanel).toBe('sftp')
    expect(workspaceState.rightPanelVisible).toBe(true)
  })
})
