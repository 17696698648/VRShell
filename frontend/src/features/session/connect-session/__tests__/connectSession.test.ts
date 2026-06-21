import {describe, expect, it} from 'vitest'
import {sessionState} from '../../../../entities/session'
import {terminalState} from '../../../../entities/terminal'
import {createSession} from '../../create-session/createSession'
import {connectSession} from '../connectSession'

describe('connectSession', () => {
  it('opens a terminal tab through the repository flow', async () => {
    const session = createSession('vitest-session')
    await connectSession(session)

    expect(sessionState.activeSessionId).toBe(session.id)
    expect(sessionState.sessions.find((item) => item.id === session.id)?.status).toBe('connected')
    expect(terminalState.tabs.some((tab) => tab.sessionId === session.id && tab.backendSessionId)).toBe(true)
  })
})
