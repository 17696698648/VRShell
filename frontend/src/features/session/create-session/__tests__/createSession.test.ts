import {afterEach, describe, expect, it} from 'vitest'
import {removeSession, sessionState, SessionValidationError} from '../../../../entities/session'
import {createSession} from '../createSession'

describe('createSession', () => {
  const createdIds: string[] = []

  afterEach(() => {
    for (const id of createdIds.splice(0)) removeSession(id)
  })

  it('trims and creates valid sessions', () => {
    const session = createSession({name: ' demo ', host: ' example.com ', port: 22, username: ' deploy ', auth: {type: 'agent'}})
    createdIds.push(session.id)

    expect(session.name).toBe('demo')
    expect(session.host).toBe('example.com')
    expect(session.username).toBe('deploy')
    expect(sessionState.sessions.some((item) => item.id === session.id)).toBe(true)
  })

  it('rejects invalid sessions before adding them', () => {
    const before = sessionState.sessions.length

    expect(() => createSession({name: '', host: '', port: 0, username: '', auth: {type: 'agent'}})).toThrow(SessionValidationError)
    expect(sessionState.sessions).toHaveLength(before)
  })
})
