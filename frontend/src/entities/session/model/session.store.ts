import {reactive} from 'vue'
import {addGroupToTree, addSessionToTree, moveSessionInTree, removeGroupFromTree, removeSessionFromTree} from './sessionTree'
import type {SessionGroup, SessionHost} from './session.types'

interface SessionState {
  groups: SessionGroup[]
  sessions: SessionHost[]
  activeSessionId: string
}

export const sessionState = reactive<SessionState>({
  activeSessionId: 'prod-api',
  groups: [
    {id: 'favorites', name: 'Favorites', sessionIds: ['prod-api', 'staging-web']},
    {id: 'labs', name: 'Labs', sessionIds: ['edge-node']},
  ],
  sessions: [
    {id: 'prod-api', name: 'prod-api-01', host: '10.42.0.12', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'favorites', tags: ['prod'], status: 'connected', auth: {type: 'agent'}, backendSessionId: 'mock-deploy-10.42.0.12'},
    {id: 'staging-web', name: 'staging-web', host: '172.16.8.20', port: 22, username: 'ubuntu', protocol: 'ssh', groupId: 'favorites', tags: ['staging'], status: 'idle', auth: {type: 'agent'}},
    {id: 'edge-node', name: 'edge-node-a', host: '192.168.3.44', port: 22, username: 'root', protocol: 'ssh', groupId: 'labs', tags: ['lab'], status: 'idle', auth: {type: 'agent'}},
  ],
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
