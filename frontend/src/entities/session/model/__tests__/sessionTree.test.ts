import {describe, expect, it} from 'vitest'
import type {SessionGroup, SessionHost} from '../session.types'
import {addGroupToTree, addSessionToTree, moveGroupInTree, moveSessionInTree, removeGroupFromTree, removeSessionFromTree} from '../sessionTree'

function createTree() {
  const groups: SessionGroup[] = [
    {id: 'favorites', name: 'Favorites', sessionIds: ['prod']},
    {id: 'labs', name: 'Labs', sessionIds: ['edge']},
  ]
  const sessions: SessionHost[] = [
    {id: 'prod', name: 'prod', host: '10.0.0.1', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'favorites', tags: [], status: 'idle'},
    {id: 'edge', name: 'edge', host: '10.0.0.2', port: 22, username: 'root', protocol: 'ssh', groupId: 'labs', tags: [], status: 'idle'},
  ]
  return {groups, sessions}
}

describe('sessionTree', () => {
  it('adds sessions to their group once', () => {
    const {groups, sessions} = createTree()
    const session: SessionHost = {id: 'new', name: 'new', host: '10.0.0.3', port: 22, username: 'dev', protocol: 'ssh', groupId: 'favorites', tags: [], status: 'idle'}

    addSessionToTree(groups, sessions, session)
    addSessionToTree(groups, sessions, session)

    expect(sessions.filter((item) => item.id === 'new')).toHaveLength(1)
    expect(groups[0].sessionIds.filter((id) => id === 'new')).toHaveLength(1)
  })

  it('moves sessions between groups at bounded index', () => {
    const {groups, sessions} = createTree()

    const moved = moveSessionInTree(groups, sessions, 'prod', 'labs', 0)

    expect(moved).toBe(true)
    expect(sessions[0].groupId).toBe('labs')
    expect(groups[0].sessionIds).toEqual([])
    expect(groups[1].sessionIds).toEqual(['prod', 'edge'])
  })

  it('reorders sessions in the same group', () => {
    const {groups, sessions} = createTree()
    groups[0].sessionIds.push('dev')
    sessions.push({id: 'dev', name: 'dev', host: '10.0.0.3', port: 22, username: 'dev', protocol: 'ssh', groupId: 'favorites', tags: [], status: 'idle'})

    expect(moveSessionInTree(groups, sessions, 'prod', 'favorites', 1)).toBe(true)

    expect(groups[0].sessionIds).toEqual(['dev', 'prod'])
  })

  it('removes sessions from sessions and all groups', () => {
    const {groups, sessions} = createTree()

    removeSessionFromTree(groups, sessions, 'prod')

    expect(sessions.map((session) => session.id)).toEqual(['edge'])
    expect(groups[0].sessionIds).toEqual([])
  })

  it('adds groups without sharing session id arrays', () => {
    const {groups} = createTree()
    const group: SessionGroup = {id: 'new-group', name: 'New', sessionIds: ['prod']}

    expect(addGroupToTree(groups, group)).toBe(true)
    group.sessionIds.push('edge')

    expect(groups.at(-1)?.sessionIds).toEqual(['prod'])
  })

  it('moves removed group sessions to fallback group', () => {
    const {groups, sessions} = createTree()

    const removed = removeGroupFromTree(groups, sessions, 'labs', 'favorites')

    expect(removed).toBe(true)
    expect(groups.map((group) => group.id)).toEqual(['favorites'])
    expect(sessions.find((session) => session.id === 'edge')?.groupId).toBe('favorites')
    expect(groups[0].sessionIds).toEqual(['prod', 'edge'])
  })

  it('removes sessions when group has no fallback', () => {
    const {groups, sessions} = createTree()

    removeGroupFromTree(groups, sessions, 'labs')

    expect(groups.map((group) => group.id)).toEqual(['favorites'])
    expect(sessions.map((session) => session.id)).toEqual(['prod'])
  })

  it('moves groups within the target sibling level', () => {
    const groups: SessionGroup[] = [
      {id: 'all', name: '所有', sessionIds: []},
      {id: 'ops', name: 'Ops', sessionIds: [], parentId: 'all'},
      {id: 'labs', name: 'Labs', sessionIds: [], parentId: 'all'},
      {id: 'db', name: 'DB', sessionIds: [], parentId: 'ops'},
    ]

    expect(moveGroupInTree(groups, 'labs', 'ops', 0)).toBe(true)

    expect(groups.map((group) => group.id)).toEqual(['all', 'ops', 'labs', 'db'])
    expect(groups.find((group) => group.id === 'labs')?.parentId).toBe('ops')
  })

  it('prevents moving a group into its descendant', () => {
    const groups: SessionGroup[] = [
      {id: 'all', name: '所有', sessionIds: []},
      {id: 'ops', name: 'Ops', sessionIds: [], parentId: 'all'},
      {id: 'db', name: 'DB', sessionIds: [], parentId: 'ops'},
    ]

    expect(moveGroupInTree(groups, 'ops', 'db', 0)).toBe(false)
    expect(groups.find((group) => group.id === 'ops')?.parentId).toBe('all')
  })
})
