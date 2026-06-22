import {sessionState} from '../../../entities/session'
import {sftpState} from '../../../entities/sftp'
import {taskItems} from '../../../entities/task'
import {terminalState} from '../../../entities/terminal'
import {workspaceState} from '../../../entities/workspace'
import {executeCommand} from '../../../shared/command'
import {logState} from '../../../shared/lib/logger'
import {registerStatusBarItem} from './statusItemRegistry'

export function registerDefaultStatusItems() {
  const disposables = [
    registerStatusBarItem('workbench.health', () => {
      const issueCount = getFailedSessionCount() + getFailedTerminalCount() + getFailedTaskCount() + (sftpState.error ? 1 : 0)
      return {
        align: 'left',
        id: 'workbench.health',
        iconName: issueCount > 0 ? 'alert' : 'check',
        intent: issueCount > 0 ? 'danger' : 'success',
        label: issueCount > 0 ? `${issueCount} issues` : 'Ready',
        compactLabel: issueCount > 0 ? `${issueCount}` : 'OK',
        priority: 10,
        title: issueCount > 0 ? `${issueCount} issues need attention` : 'Workbench ready',
      }
    }),
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
      return {
        align: 'center',
        id: 'task.running',
        iconName: 'tasks',
        intent: runningCount > 0 ? 'info' : 'neutral',
        label: `${runningCount}`,
        fullLabel: `Tasks ${runningCount}`,
        onClick: () => executeCommand('workspace.openTasksPanel'),
        priority: 10,
        title: `${runningCount} running tasks`,
      }
    }),
    registerStatusBarItem('terminal.count', () => ({
      align: 'center',
      id: 'terminal.count',
      iconName: 'terminals',
      intent: getFailedTerminalCount() > 0 ? 'danger' : 'neutral',
      label: `${terminalState.tabs.length}`,
      fullLabel: `Terminals ${terminalState.tabs.length}`,
      priority: 20,
      title: `${terminalState.tabs.length} terminal tabs`,
    })),
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
        fullLabel: `Problems ${problemCount}`,
        onClick: () => executeCommand('workspace.openProblemsPanel'),
        priority: 34,
        title: `${problemCount} warnings/errors`,
      }
    }),
    registerStatusBarItem('workspace.logs', () => {
      const warningCount = logState.entries.filter((entry) => entry.level === 'warning' || entry.level === 'error' || entry.level === 'fatal').length
      return {
        align: 'right',
        id: 'workspace.logs',
        iconName: 'logs',
        intent: warningCount > 0 ? 'warning' : 'neutral',
        label: warningCount > 0 ? `${warningCount}` : 'Logs',
        fullLabel: warningCount > 0 ? `Logs ${warningCount}` : 'Logs',
        onClick: () => executeCommand('workspace.openLogsPanel'),
        priority: 35,
        title: warningCount > 0 ? `${warningCount} warnings/errors in logs` : 'Open logs panel',
      }
    }),
    registerStatusBarItem('workspace.output', () => ({
      align: 'right',
      id: 'workspace.output',
      iconName: 'terminal',
      label: 'Output',
      onClick: () => executeCommand('workspace.openOutputPanel'),
      priority: 36,
      title: 'Open output panel',
    })),
    registerStatusBarItem('workspace.theme', () => ({
      align: 'right',
      id: 'workspace.theme',
      iconName: 'palette',
      label: workspaceState.theme,
      fullLabel: `Theme ${workspaceState.theme}`,
      onClick: () => executeCommand('settings.toggleTheme'),
      priority: 40,
      title: `Theme: ${workspaceState.theme}; density: ${workspaceState.density}`,
    })),
    registerStatusBarItem('workspace.layout', () => ({
      align: 'right',
      id: 'workspace.layout',
      iconName: 'layout',
      label: workspaceState.layoutPreset,
      compactLabel: 'Layout',
      fullLabel: `Layout ${workspaceState.layoutPreset}`,
      onClick: () => executeCommand('workspace.resetLayout'),
      priority: 45,
      title: `Layout: ${workspaceState.layoutPreset}; dock: ${workspaceState.panelPlacement}; mode: ${workspaceState.mainAreaMode}`,
    })),
    registerStatusBarItem('workspace.density', () => ({
      align: 'right',
      id: 'workspace.density',
      iconName: 'activity',
      label: workspaceState.density,
      fullLabel: `Density ${workspaceState.density}`,
      priority: 50,
      title: `UI density: ${workspaceState.density}`,
    })),
  ]

  return () => disposables.forEach((dispose) => dispose())
}

function getConnectedSessionCount() {
  return sessionState.sessions.filter((session) => session.status === 'connected').length
}

function getFailedSessionCount() {
  return sessionState.sessions.filter((session) => session.status === 'failed').length
}

function getFailedTerminalCount() {
  return terminalState.tabs.filter((tab) => tab.status === 'failed').length
}

function getFailedTaskCount() {
  return taskItems.filter((task) => task.status === 'failed').length
}
