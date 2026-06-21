import {describe, expect, it} from 'vitest'
import type {SessionHost} from '../session.types'
import {SessionValidationError, assertValidSession, validateNewSession, validateSessionFields} from '../sessionValidation'

const validSession: SessionHost = {
  id: 'new',
  name: 'new',
  host: 'example.com',
  port: 22,
  username: 'deploy',
  protocol: 'ssh',
  groupId: 'favorites',
  tags: [],
  status: 'idle',
}

describe('sessionValidation', () => {
  it('validates required fields and port range', () => {
    const result = validateSessionFields({name: ' ', host: '', username: '', port: 70000})

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Session name is required')
    expect(result.errors).toContain('Host is required')
    expect(result.errors).toContain('Username is required')
    expect(result.errors).toContain('Port must be between 1 and 65535')
  })

  it('rejects duplicate id and name', () => {
    const result = validateNewSession({...validSession, id: 'prod', name: 'Prod'}, [{...validSession, id: 'prod', name: 'prod'}])

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Session id already exists: prod')
    expect(result.errors).toContain('Session name already exists: Prod')
  })

  it('allows duplicate checks to ignore the edited session', () => {
    const result = validateNewSession({...validSession, id: 'prod', name: 'Prod'}, [{...validSession, id: 'prod', name: 'prod'}], 'prod')

    expect(result.valid).toBe(true)
  })

  it('throws validation errors for invalid sessions', () => {
    expect(() => assertValidSession({...validSession, host: ''}, [])).toThrow(SessionValidationError)
  })
})
