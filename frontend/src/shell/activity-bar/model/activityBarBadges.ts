import {computed} from 'vue'
import {sessionState} from '../../../entities/session'
import type {WorkspacePanel} from '../../../entities/workspace'

export interface ActivityBarBadge {
  count: number
  intent: 'info' | 'warning' | 'danger'
  title: string
}

export function useActivityBarBadges() {
  return computed<Partial<Record<WorkspacePanel, ActivityBarBadge>>>(() => {
    const failedSessions = sessionState.sessions.filter((session) => session.status === 'failed').length

    return {
      sessions: failedSessions > 0 ? {count: failedSessions, intent: 'danger', title: `${failedSessions} sessions failed`} : undefined,
    }
  })
}

export function formatActivityBarBadge(count: number) {
  return count > 99 ? '99+' : String(count)
}
