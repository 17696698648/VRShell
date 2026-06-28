import {sessionState} from '../../../entities/session'
import {sftpState} from '../../../entities/sftp'
import {taskItems} from '../../../entities/task'
import {terminalState} from '../../../entities/terminal'
import {executeCommand} from '../../../shared/command'
import {logState} from '../../../shared/lib/logger'
import {registerStatusBarItem} from './statusItemRegistry'

export function registerDefaultStatusItems() {
  const disposables = [
    registerStatusBarItem('session.connected', () => ({
      align: 'left',
      id: 'session.connected',
      iconName: 'server',
      intent: getConnectedSessionCount() > 0 ? 'success' : 'neutral',
      label: `${getConnectedSessionCount()}`,
      fullLabel: `SSH ${getConnectedSessionCount()}`,
      onClick: () => executeCommand('workspace.openSessionsPanel'),
      priority: 20,
      title: `${getConnectedSessionCount()} SSH sessions connected`,
    })),
    registerStatusBarItem('network.latency', () => {
      const activeTerminal = terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId)
      if (!activeTerminal) return null

      return {
        align: 'left',
        id: 'network.latency',
        iconName: 'activity',
        intent: 'info',
        label: `${activeTerminal.latency ?? '--'}ms`,
        compactLabel: `${activeTerminal.latency ?? '--'}ms`,
        fullLabel: `Latency ${activeTerminal.latency ?? '--'}ms`,
        priority: 25,
        title: `Network latency to ${activeTerminal.title}: ${activeTerminal.latency ?? 'unknown'}ms`,
      }
    }),
    registerStatusBarItem('terminal.active', () => {
      const activeTerminal = terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId)
      if (!activeTerminal) return null
      return {
        align: 'left',
        id: 'terminal.active',
        iconName: 'terminal',
        label: activeTerminal.title,
        compactLabel: 'Active',
        priority: 30,
        title: `Active terminal: ${activeTerminal.title}`,
      }
    }),
    registerStatusBarItem('task.running', () => {
      const runningCount = taskItems.filter((task) => task.status === 'running').length
      const failedCount = taskItems.filter((task) => task.status === 'failed').length
      const taskLabel = failedCount > 0 ? `${failedCount} failed` : `${runningCount} running`
      return {
        align: 'center',
        id: 'task.running',
        iconName: 'tasks',
        intent: failedCount > 0 ? 'danger' : runningCount > 0 ? 'info' : 'neutral',
        label: failedCount > 0 ? `${failedCount}!` : `${runningCount}`,
        fullLabel: `Queue ${taskLabel}`,
        onClick: () => executeCommand('workspace.openTasksPanel'),
        priority: 10,
        title: failedCount > 0 ? `${failedCount} failed tasks — open Task Queue` : `${runningCount} running tasks — open Task Queue`,
      }
    }),
    registerStatusBarItem('sftp.status', () => ({
      align: 'center',
      id: 'sftp.status',
      iconName: 'sftp',
      intent: sftpState.error ? 'danger' : sftpState.loading ? 'warning' : 'neutral',
      label: sftpState.error ? 'Error' : sftpState.loading ? 'Loading' : sftpState.path,
      compactLabel: sftpState.error ? 'Error' : sftpState.loading ? '...' : 'SFTP',
      fullLabel: `SFTP ${sftpState.error ? 'Error' : sftpState.loading ? 'Loading' : sftpState.path}`,
      onClick: () => executeCommand('sftp.openPanel'),
      priority: 30,
      title: sftpState.error ? sftpState.error : `SFTP path: ${sftpState.path}`,
    })),
    registerStatusBarItem('workspace.problems', () => {
      const problemCount = logState.entries.filter((entry) => entry.level === 'warning' || entry.level === 'error' || entry.level === 'fatal').length
      if (problemCount === 0) return null
      return {
        align: 'right',
        id: 'workspace.problems',
        iconName: 'alert',
        intent: 'danger',
        label: `${problemCount}`,
        fullLabel: `Issues ${problemCount}`,
        onClick: () => executeCommand('workspace.openLogsPanel'),
        priority: 34,
        title: `${problemCount} warnings/errors — open Log Center`,
      }
    }),
  ]

  return () => disposables.forEach((dispose) => dispose())
}

function getConnectedSessionCount() {
  return sessionState.sessions.filter((session) => session.status === 'connected').length
}
