import {assertValidSession, patchSession, sessionState, type SessionHost} from '../../../entities/session'

export type EditSessionInput = Partial<Pick<SessionHost, 'name' | 'host' | 'port' | 'username' | 'auth' | 'tags'>>

export function editSession(sessionId: string, input: EditSessionInput) {
  const current = sessionState.sessions.find((session) => session.id === sessionId)
  if (!current) throw new Error(`Session not found: ${sessionId}`)

  const next: SessionHost = {
    ...current,
    ...input,
    name: input.name === undefined ? current.name : input.name.trim(),
    host: input.host === undefined ? current.host : input.host.trim(),
    username: input.username === undefined ? current.username : input.username.trim(),
  }

  assertValidSession(next, sessionState.sessions, sessionId)
  patchSession(sessionId, {
    name: next.name,
    host: next.host,
    port: next.port,
    username: next.username,
    auth: next.auth,
    tags: next.tags,
  })
  return next
}
