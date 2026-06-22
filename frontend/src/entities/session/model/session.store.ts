import {reactive} from 'vue'
import {addGroupToTree, addSessionToTree, moveSessionInTree, removeGroupFromTree, removeSessionFromTree} from './sessionTree'
import type {SessionGroup, SessionHost} from './session.types'

interface SessionState {
  groups: SessionGroup[]
  sessions: SessionHost[]
  activeSessionId: string
}

export const sessionState = reactive<SessionState>({
  activeSessionId: '',
  groups: [
    {id: 'all', name: '所有', sessionIds: []},
  ],
  sessions: [],
})

export function getActiveSession() {
  return sessionState.sessions.find((session) => session.id === sessionState.activeSessionId) ?? null
}

export function setActiveSession(sessionId: string) {
  sessionState.activeSessionId = sessionId
}

export function addSession(session: SessionHost) {
  addSessionToTree(sessionState.groups, sessionState.sessions, session)
}

export function addSessions(sessions: SessionHost[]) {
  for (const session of sessions) addSession(session)
}

export function patchSession(sessionId: string, patch: Partial<SessionHost>) {
  const session = sessionState.sessions.find((item) => item.id === sessionId)
  if (session) Object.assign(session, patch)
}

export function moveSession(sessionId: string, targetGroupId: string, targetIndex?: number) {
  return moveSessionInTree(sessionState.groups, sessionState.sessions, sessionId, targetGroupId, targetIndex)
}

export function addSessionGroup(group: SessionGroup) {
  return addGroupToTree(sessionState.groups, group)
}

export function removeSessionGroup(groupId: string, fallbackGroupId?: string) {
  const removed = removeGroupFromTree(sessionState.groups, sessionState.sessions, groupId, fallbackGroupId)
  if (removed && !sessionState.sessions.some((session) => session.id === sessionState.activeSessionId)) {
    sessionState.activeSessionId = sessionState.sessions[0]?.id ?? ''
  }
  return removed
}

export function removeSession(sessionId: string) {
  removeSessionFromTree(sessionState.groups, sessionState.sessions, sessionId)
  if (sessionState.activeSessionId === sessionId) {
    sessionState.activeSessionId = sessionState.sessions[0]?.id ?? ''
  }
}
