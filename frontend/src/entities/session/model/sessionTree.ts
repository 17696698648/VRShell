import type {SessionGroup, SessionHost} from './session.types'

export function addSessionToTree(groups: SessionGroup[], sessions: SessionHost[], session: SessionHost) {
  if (sessions.some((item) => item.id === session.id)) return
  sessions.push(session)
  const group = groups.find((item) => item.id === session.groupId)
  if (group && !group.sessionIds.includes(session.id)) group.sessionIds.push(session.id)
}

export function removeSessionFromTree(groups: SessionGroup[], sessions: SessionHost[], sessionId: string) {
  const index = sessions.findIndex((session) => session.id === sessionId)
  if (index >= 0) sessions.splice(index, 1)
  for (const group of groups) {
    group.sessionIds = group.sessionIds.filter((id) => id !== sessionId)
  }
}

export function moveSessionInTree(groups: SessionGroup[], sessions: SessionHost[], sessionId: string, targetGroupId: string, targetIndex?: number) {
  const session = sessions.find((item) => item.id === sessionId)
  const targetGroup = groups.find((group) => group.id === targetGroupId)
  if (!session || !targetGroup) return false

  for (const group of groups) {
    group.sessionIds = group.sessionIds.filter((id) => id !== sessionId)
  }

  const boundedIndex = clampIndex(targetIndex ?? targetGroup.sessionIds.length, targetGroup.sessionIds.length)
  targetGroup.sessionIds.splice(boundedIndex, 0, sessionId)
  session.groupId = targetGroupId
  return true
}

export function addGroupToTree(groups: SessionGroup[], group: SessionGroup) {
  if (groups.some((item) => item.id === group.id)) return false
  groups.push({...group, sessionIds: [...group.sessionIds], parentId: group.parentId ?? 'all'})
  return true
}

export function removeGroupFromTree(groups: SessionGroup[], sessions: SessionHost[], groupId: string, fallbackGroupId?: string) {
  const groupIdsToRemove = collectDescendantGroupIds(groups, groupId)
  if (groupIdsToRemove.length === 0) return false
  const removedGroups = groups.filter((group) => groupIdsToRemove.includes(group.id))
  const fallbackGroup = fallbackGroupId ? groups.find((group) => group.id === fallbackGroupId && !groupIdsToRemove.includes(group.id)) : null

  for (let index = groups.length - 1; index >= 0; index -= 1) {
    if (groupIdsToRemove.includes(groups[index].id)) groups.splice(index, 1)
  }

  for (const removedGroup of removedGroups) {
    for (const sessionId of removedGroup.sessionIds) {
      const session = sessions.find((item) => item.id === sessionId)
      if (!session) continue
      if (fallbackGroup) {
        session.groupId = fallbackGroup.id
        if (!fallbackGroup.sessionIds.includes(session.id)) fallbackGroup.sessionIds.push(session.id)
      } else {
        const index = sessions.findIndex((item) => item.id === sessionId)
        if (index >= 0) sessions.splice(index, 1)
      }
    }
  }

  return true
}

function collectDescendantGroupIds(groups: SessionGroup[], rootGroupId: string) {
  const ids = [rootGroupId]
  for (let index = 0; index < ids.length; index += 1) {
    ids.push(...groups.filter((group) => group.parentId === ids[index]).map((group) => group.id))
  }
  return ids.filter((id) => groups.some((group) => group.id === id))
}

export function moveGroupInTree(groups: SessionGroup[], groupId: string, targetParentId: string | null | undefined, targetIndex: number) {
  const currentIndex = groups.findIndex((g) => g.id === groupId)
  if (currentIndex < 0 || groupId === 'all') return false

  const group = groups[currentIndex]
  const normalizedParentId = targetParentId ?? null
  if (group.id === normalizedParentId || isDescendantGroup(groups, normalizedParentId, group.id)) return false

  const [movedGroup] = groups.splice(currentIndex, 1)
  movedGroup.parentId = normalizedParentId

  const siblingIndexes = groups
    .map((item, index) => ({item, index}))
    .filter(({item}) => (item.parentId ?? null) === normalizedParentId)
    .map(({index}) => index)
  const boundedSiblingIndex = clampIndex(targetIndex, siblingIndexes.length)
  const insertIndex = boundedSiblingIndex >= siblingIndexes.length ? groups.length : siblingIndexes[boundedSiblingIndex]
  groups.splice(insertIndex, 0, movedGroup)
  return true
}

function isDescendantGroup(groups: SessionGroup[], groupId: string | null | undefined, ancestorId: string) {
  let current = groupId ?? null
  const visited = new Set<string>()
  while (current) {
    if (current === ancestorId) return true
    if (visited.has(current)) return false
    visited.add(current)
    current = groups.find((group) => group.id === current)?.parentId ?? null
  }
  return false
}

function clampIndex(index: number, length: number) {
  if (index < 0) return 0
  if (index > length) return length
  return index
}
