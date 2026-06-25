import type {WorkspacePanel} from '../../../entities/workspace'

export interface ActivityBarItem {
  id: WorkspacePanel
  icon: string
  commandId: string
}

export const activityBarItems: ActivityBarItem[] = [
  {id: 'sessions', icon: 'SSH', commandId: 'workspace.openSessionsPanel'},
  {id: 'sftp', icon: 'SFTP', commandId: 'sftp.openPanel'},
  {id: 'tasks', icon: 'TASK', commandId: 'workspace.openTasksPanel'},
  {id: 'settings', icon: 'SET', commandId: 'settings.openPanel'},
]
