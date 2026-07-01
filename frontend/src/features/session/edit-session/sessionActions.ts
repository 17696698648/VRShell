import {sessionState, type SessionHost} from '../../../entities/session'
import {createSession} from '../create-session/createSession'
import {editSession} from './editSession'

export const favoriteSessionTag = 'favorite'

export function duplicateSession(session: SessionHost) {
  const copy = createSession({
    name: nextCopyName(session.name),
    host: session.host,
    port: session.port,
    username: session.username,
    auth: session.auth ?? {type: 'agent'},
  }, session.groupId)
  return editSession(copy.id, {tags: [...session.tags]})
}

export function toggleFavoriteSession(session: SessionHost) {
  const tags = new Set(session.tags)
  if (tags.has(favoriteSessionTag)) tags.delete(favoriteSessionTag)
  else tags.add(favoriteSessionTag)
  return editSession(session.id, {tags: Array.from(tags)})
}

export function isFavoriteSession(session: SessionHost) {
  return session.tags.includes(favoriteSessionTag)
}

function nextCopyName(name: string) {
  const baseName = `${name} Copy`
  if (!sessionState.sessions.some((session) => session.name === baseName)) return baseName
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${baseName} ${index}`
    if (!sessionState.sessions.some((session) => session.name === candidate)) return candidate
  }
  return `${baseName} ${Date.now()}`
}
