import {afterEach, describe, expect, it} from 'vitest'
import {sessionState, SessionValidationError} from '../../../../entities/session'
import {editSession} from '../editSession'

const originalSession = JSON.parse(JSON.stringify(sessionState.sessions[0])) as (typeof sessionState.sessions)[number]

describe('editSession', () => {
  afterEach(() => {
    Object.assign(sessionState.sessions[0], JSON.parse(JSON.stringify(originalSession)))
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
