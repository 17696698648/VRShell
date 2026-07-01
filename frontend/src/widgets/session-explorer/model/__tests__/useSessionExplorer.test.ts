import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionState, type SessionHost} from '../../../../entities/session'
import {favoriteSessionTag} from '../../../../features/session/edit-session/sessionActions'
import {useSessionExplorer} from '../useSessionExplorer'

const originalSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const originalGroups = JSON.parse(JSON.stringify(sessionState.groups)) as typeof sessionState.groups

const sessions: SessionHost[] = [
  {id: 'prod', name: 'Prod API', host: 'prod.example.com', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [favoriteSessionTag, 'api'], status: 'idle'},
  {id: 'stage', name: 'Stage DB', host: 'stage.example.com', port: 22, username: 'postgres', protocol: 'ssh', groupId: 'all', tags: ['db'], status: 'idle'},
]

describe('useSessionExplorer', () => {
  beforeEach(() => {
    sessionState.groups.splice(0, sessionState.groups.length, {id: 'all', name: 'All', sessionIds: sessions.map((session) => session.id)})
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(sessions)))
  })

  afterEach(() => {
    sessionState.groups.splice(0, sessionState.groups.length, ...JSON.parse(JSON.stringify(originalGroups)))
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(originalSessions)))
  })

  it('filters by #tag and favorites', () => {
    const explorer = useSessionExplorer()

    explorer.query.value = '#api'
    expect(explorer.filteredSessions.value.map((session) => session.id)).toEqual(['prod'])

    explorer.query.value = ''
    explorer.favoriteOnly.value = true
    expect(explorer.filteredSessions.value.map((session) => session.id)).toEqual(['prod'])
  })
})
