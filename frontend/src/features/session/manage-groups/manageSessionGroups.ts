import {addSessionGroup, moveSession, removeSessionGroup, sessionState, type SessionGroup, type SessionHost} from '../../../entities/session'
import {requestConfirm, requestPrompt} from '../../../shared/dialog'
import {createId} from '../../../shared/lib/createId'

export async function createSessionGroup() {
  const name = await requestPrompt({title: 'New group', label: 'Group name', confirmLabel: 'Create'})
  const trimmedName = name?.trim()
  if (!trimmedName) return null
  const group: SessionGroup = {id: createId('group'), name: trimmedName, sessionIds: []}
  addSessionGroup(group)
  return group
}

export async function deleteSessionGroup(group: SessionGroup) {
  const fallbackGroup = sessionState.groups.find((item) => item.id !== group.id)
  const confirmed = await requestConfirm({
    title: 'Delete group',
    message: fallbackGroup
      ? `Delete ${group.name}? Sessions will move to ${fallbackGroup.name}.`
      : `Delete ${group.name}? Sessions in this group will be removed.`,
    confirmLabel: 'Delete',
    tone: 'danger',
  })
  if (!confirmed) return false
  return removeSessionGroup(group.id, fallbackGroup?.id)
}

export function moveSessionToGroup(session: SessionHost, group: SessionGroup) {
  return moveSession(session.id, group.id)
}
