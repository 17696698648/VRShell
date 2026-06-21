import {addSession, assertValidSession, sessionState, type SessionAuth, type SessionHost} from '../../../entities/session'
import {createId} from '../../../shared/lib/createId'

export interface CreateSessionInput {
  name: string
  host: string
  port: number
  username: string
  auth: SessionAuth
}

export function createSession(input: string | CreateSessionInput, groupId = 'favorites') {
  const sessionInput = typeof input === 'string'
    ? {name: input, host: '127.0.0.1', port: 22, username: 'user', auth: {type: 'agent'} as SessionAuth}
    : input
  const session: SessionHost = {
    id: createId('session'),
    name: sessionInput.name.trim(),
    host: sessionInput.host.trim(),
    port: sessionInput.port,
    username: sessionInput.username.trim(),
    protocol: 'ssh',
    groupId,
    tags: ['new'],
    status: 'idle',
    auth: sessionInput.auth,
  }
  assertValidSession(session, sessionState.sessions)
  addSession(session)
  return session
}
