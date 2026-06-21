import {markRaw} from 'vue'
import {sessionState} from '../../entities/session'
import {sftpState} from '../../entities/sftp'
import {taskItems} from '../../entities/task'
import {registerSidebarPanel} from '../../features/workspace/sidebar-panel-registry'
import SettingsSidebarHint from '../../shell/sidebar/SettingsSidebarHint.vue'
import SearchPanel from '../../widgets/search-panel/ui/SearchPanel.vue'
import SessionExplorer from '../../widgets/session-explorer/ui/SessionExplorer.vue'
import SftpExplorer from '../../widgets/sftp-explorer/ui/SftpExplorer.vue'
import TaskCenter from '../../widgets/task-center/ui/TaskCenter.vue'

export function registerDefaultSidebarPanels() {
  const disposables = [
    registerSidebarPanel({id: 'sessions', title: 'Sessions', icon: 'SSH', order: 10, commandId: 'workspace.openSessionsPanel', component: markRaw(SessionExplorer), badge: () => getFailedSessionBadge()}),
    registerSidebarPanel({id: 'sftp', title: 'SFTP', icon: 'SFTP', order: 20, commandId: 'sftp.openPanel', component: markRaw(SftpExplorer), props: {compact: true}, badge: () => sftpState.error ? {count: 1, intent: 'danger', title: sftpState.error} : undefined}),
    registerSidebarPanel({id: 'tasks', title: 'Tasks', icon: 'TASK', order: 30, commandId: 'workspace.openTasksPanel', component: markRaw(TaskCenter), props: {compact: true}, badge: () => getTaskBadge()}),
    registerSidebarPanel({id: 'search', title: 'Search', icon: 'FIND', order: 40, commandId: 'workspace.openSearchPanel', component: markRaw(SearchPanel)}),
    registerSidebarPanel({id: 'settings', title: 'Settings', icon: 'SET', order: 90, commandId: 'settings.openPanel', component: markRaw(SettingsSidebarHint)}),
  ]
  return () => disposables.forEach((dispose) => dispose())
}

function getFailedSessionBadge() {
  const failedSessions = sessionState.sessions.filter((session) => session.status === 'failed').length
  return failedSessions > 0 ? {count: failedSessions, intent: 'danger' as const, title: `${failedSessions} sessions failed`} : undefined
}

function getTaskBadge() {
  const failedTasks = taskItems.filter((task) => task.status === 'failed').length
  if (failedTasks > 0) return {count: failedTasks, intent: 'danger' as const, title: `${failedTasks} tasks failed`}
  const runningTasks = taskItems.filter((task) => task.status === 'running').length
  return runningTasks > 0 ? {count: runningTasks, intent: 'info' as const, title: `${runningTasks} tasks running`} : undefined
}
