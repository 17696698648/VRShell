import {computed} from 'vue'
import {sessionState} from '../../../entities/session'
import {taskItems} from '../../../entities/task'
import type {WorkspacePanel} from '../../../entities/workspace'

export interface ActivityBarBadge {
  count: number
  intent: 'info' | 'warning' | 'danger'
  title: string
}

export function useActivityBarBadges() {
  return computed<Partial<Record<WorkspacePanel, ActivityBarBadge>>>(() => {
    const failedSessions = sessionState.sessions.filter((session) => session.status === 'failed').length
    const runningTasks = taskItems.filter((task) => task.status === 'running').length
    const failedTasks = taskItems.filter((task) => task.status === 'failed').length

    return {
      sessions: failedSessions > 0 ? {count: failedSessions, intent: 'danger', title: `${failedSessions} sessions failed`} : undefined,
      tasks: getTaskBadge(runningTasks, failedTasks),
    }
  })
}

export function formatActivityBarBadge(count: number) {
  return count > 99 ? '99+' : String(count)
}

function getTaskBadge(runningTasks: number, failedTasks: number): ActivityBarBadge | undefined {
  if (failedTasks > 0) return {count: failedTasks, intent: 'danger', title: `${failedTasks} tasks failed`}
  if (runningTasks > 0) return {count: runningTasks, intent: 'info', title: `${runningTasks} tasks running`}
  return undefined
}
