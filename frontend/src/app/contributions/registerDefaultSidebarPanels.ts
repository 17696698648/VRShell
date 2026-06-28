import {markRaw} from 'vue'
import {Server} from '@lucide/vue'
import {sessionState} from '../../entities/session'
import {registerSidebarPanel} from '../../features/workspace/sidebar-panel-registry'
import SessionExplorer from '../../widgets/session-explorer/ui/SessionExplorer.vue'

export function registerDefaultSidebarPanels() {
  const disposables = [
    registerSidebarPanel({id: 'sessions', title: 'Sessions', icon: markRaw(Server), order: 10, commandId: 'workspace.openSessionsPanel', component: markRaw(SessionExplorer), badge: () => getFailedSessionBadge()}),
  ]
  return () => disposables.forEach((dispose) => dispose())
}

function getFailedSessionBadge() {
  const failedSessions = sessionState.sessions.filter((session) => session.status === 'failed').length
  return failedSessions > 0 ? {count: failedSessions, intent: 'danger' as const, title: `${failedSessions} sessions failed`} : undefined
}
