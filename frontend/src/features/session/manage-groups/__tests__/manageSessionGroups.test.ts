import {afterEach, describe, expect, it} from 'vitest'
import {sessionState} from '../../../../entities/session'
import {clearDialogs, dialogState, resolveConfirm, resolvePrompt} from '../../../../shared/dialog'
import {createSessionGroup, deleteSessionGroup, moveSessionToGroup} from '../manageSessionGroups'

const defaultGroups = JSON.parse(JSON.stringify(sessionState.groups)) as typeof sessionState.groups
const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultActiveSessionId = sessionState.activeSessionId

describe('manageSessionGroups', () => {
  afterEach(() => {
    clearDialogs()
    sessionState.groups.splice(0, sessionState.groups.length, ...JSON.parse(JSON.stringify(defaultGroups)))
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    sessionState.activeSessionId = defaultActiveSessionId
  })

  it('creates groups from prompt input', async () => {
    const result = createSessionGroup()

    expect(dialogState.prompt).toMatchObject({title: 'New group'})
    resolvePrompt('Ops')

    const group = await result
    expect(group).toMatchObject({name: 'Ops', sessionIds: []})
    expect(sessionState.groups.at(-1)?.name).toBe('Ops')
  })

  it('moves sessions to another group', () => {
    const session = sessionState.sessions[0]
    const targetGroup = sessionState.groups.find((group) => group.id !== session.groupId)

    expect(targetGroup).toBeTruthy()
    moveSessionToGroup(session, targetGroup!)

    expect(session.groupId).toBe(targetGroup!.id)
    expect(targetGroup!.sessionIds).toContain(session.id)
  })

  it('deletes groups after confirmation', async () => {
    const group = sessionState.groups[1]
    const result = deleteSessionGroup(group)

    expect(dialogState.confirm).toMatchObject({title: 'Delete group'})
    resolveConfirm(true)

    await expect(result).resolves.toBe(true)
    expect(sessionState.groups.some((item) => item.id === group.id)).toBe(false)
  })

  it('cancels group deletion', async () => {
    const group = sessionState.groups[1]
    const result = deleteSessionGroup(group)

    resolveConfirm(false)

    await expect(result).resolves.toBe(false)
    expect(sessionState.groups.some((item) => item.id === group.id)).toBe(true)
  })
})
