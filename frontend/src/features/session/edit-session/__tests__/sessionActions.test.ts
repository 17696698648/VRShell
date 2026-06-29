import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionState, type SessionHost} from '../../../../entities/session'
import {duplicateSession, favoriteSessionTag, toggleFavoriteSession} from '../sessionActions'

const originalSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const originalGroups = JSON.parse(JSON.stringify(sessionState.groups)) as typeof sessionState.groups
const originalActiveSessionId = sessionState.activeSessionId

const session: SessionHost = {
  id: 'session-1',
  name: 'Prod',
  host: 'example.com',
  port: 22,
  username: 'deploy',
  protocol: 'ssh',
  groupId: 'all',
  tags: ['api'],
  status: 'idle',
  auth: {type: 'agent'},
}

describe('sessionActions', () => {
  beforeEach(() => {
    sessionState.groups.splice(0, sessionState.groups.length, {id: 'all', name: 'All', sessionIds: ['session-1']})
    sessionState.sessions.splice(0, sessionState.sessions.length, JSON.parse(JSON.stringify(session)))
    sessionState.activeSessionId = session.id
  })

  afterEach(() => {
    sessionState.groups.splice(0, sessionState.groups.length, ...JSON.parse(JSON.stringify(originalGroups)))
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(originalSessions)))
    sessionState.activeSessionId = originalActiveSessionId
  })

  it('duplicates sessions with a unique copy name and same connection target', () => {
    const copy = duplicateSession(sessionState.sessions[0])

    expect(copy).toMatchObject({name: 'Prod Copy', host: 'example.com', username: 'deploy', port: 22, tags: ['api']})
    expect(copy.id).not.toBe(session.id)
    expect(sessionState.sessions).toHaveLength(2)
  })

  it('toggles favorite tag without dropping existing tags', () => {
    const favorite = toggleFavoriteSession(sessionState.sessions[0])
    expect(favorite.tags).toEqual(['api', favoriteSessionTag])

    const unfavorite = toggleFavoriteSession(favorite)
    expect(unfavorite.tags).toEqual(['api'])
  })
})
