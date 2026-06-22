import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionState, SessionValidationError, type SessionHost} from '../../../../entities/session'
import {editSession} from '../editSession'

const originalSession: SessionHost = {
  id: 'edit-test-host',
  name: 'edit-test-host',
  host: '10.0.0.8',
  port: 22,
  username: 'deploy',
  protocol: 'ssh',
  groupId: 'all',
  tags: [],
  status: 'idle',
}
const defaultGroups = JSON.parse(JSON.stringify(sessionState.groups)) as typeof sessionState.groups
const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultActiveSessionId = sessionState.activeSessionId

describe('editSession', () => {
  beforeEach(() => {
    sessionState.groups.splice(0, sessionState.groups.length, {id: 'all', name: '所有', sessionIds: [originalSession.id]})
    sessionState.sessions.splice(0, sessionState.sessions.length, JSON.parse(JSON.stringify(originalSession)))
    sessionState.activeSessionId = originalSession.id
  })

  afterEach(() => {
    sessionState.groups.splice(0, sessionState.groups.length, ...JSON.parse(JSON.stringify(defaultGroups)))
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    sessionState.activeSessionId = defaultActiveSessionId
  })

  it('trims and patches editable session fields', () => {
    const updated = editSession(originalSession.id, {name: ' renamed ', host: ' example.com ', username: ' deploy '})

    expect(updated).toMatchObject({name: 'renamed', host: 'example.com', username: 'deploy'})
    expect(sessionState.sessions[0]).toMatchObject({name: 'renamed', host: 'example.com', username: 'deploy'})
  })

  it('rejects invalid edits before patching', () => {
    expect(() => editSession(originalSession.id, {name: ''})).toThrow(SessionValidationError)
    expect(sessionState.sessions[0].name).toBe(originalSession.name)
  })

  it('rejects missing sessions', () => {
    expect(() => editSession('missing', {name: 'demo'})).toThrow('Session not found: missing')
  })
})
