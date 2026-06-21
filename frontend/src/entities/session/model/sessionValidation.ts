import type {SessionHost} from './session.types'

export interface SessionValidationResult {
  valid: boolean
  errors: string[]
}

export function validateSessionFields(session: Pick<SessionHost, 'name' | 'host' | 'port' | 'username'>): SessionValidationResult {
  const errors: string[] = []
  if (!session.name.trim()) errors.push('Session name is required')
  if (!session.host.trim()) errors.push('Host is required')
  if (!session.username.trim()) errors.push('Username is required')
  if (!Number.isInteger(session.port) || session.port < 1 || session.port > 65535) errors.push('Port must be between 1 and 65535')
  return {valid: errors.length === 0, errors}
}

export function validateNewSession(session: SessionHost, existingSessions: SessionHost[], ignoreSessionId?: string): SessionValidationResult {
  const fieldResult = validateSessionFields(session)
  const errors = [...fieldResult.errors]
  const comparableSessions = existingSessions.filter((item) => item.id !== ignoreSessionId)
  if (comparableSessions.some((item) => item.id === session.id)) errors.push(`Session id already exists: ${session.id}`)
  if (comparableSessions.some((item) => item.name.toLowerCase() === session.name.toLowerCase())) errors.push(`Session name already exists: ${session.name}`)
  return {valid: errors.length === 0, errors}
}

export function assertValidSession(session: SessionHost, existingSessions: SessionHost[], ignoreSessionId?: string) {
  const result = validateNewSession(session, existingSessions, ignoreSessionId)
  if (!result.valid) throw new SessionValidationError(result.errors)
}

export class SessionValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join('; '))
    this.name = 'SessionValidationError'
  }
}
