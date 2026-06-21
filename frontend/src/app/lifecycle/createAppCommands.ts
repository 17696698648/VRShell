import type {AppCommand} from '../../features/workspace/command-registry'
import {createSession} from '../../features/session/create-session/createSession'
import {connectSession} from '../../features/session/connect-session/connectSession'
import {importSshConfigSessions} from '../../features/session/create-session/importSshConfigSessions'
import {switchTheme} from '../../features/settings/switch-theme/switchTheme'
import {broadcastTerminalCommand} from '../../features/terminal/broadcast-command'
import {reconnectTerminalTab} from '../../features/terminal/manage-connection/manageTerminalConnection'
import {toggleTerminalSearch} from '../../features/terminal/search-terminal/searchTerminal'
import {closeCommandPalette, openCommandPalette} from '../../features/workspace/open-command-palette/commandPalette'
import {openDockPanel, openLogsPanel} from '../../features/workspace/open-logs-panel'
import {openQuickOpen} from '../../features/workspace/quick-open/quickOpen'
import {switchMainView} from '../../features/workspace/switch-main-view/switchMainView'
import {switchPanel} from '../../features/workspace/switch-panel/switchPanel'
import {switchTerminal} from '../../features/workspace/switch-terminal/switchTerminal'
import {terminalState} from '../../entities/terminal'
import {openWorkspaceTab, workspaceState} from '../../entities/workspace'
import {requestPrompt} from '../../shared/dialog'

export function createAppCommands(): AppCommand[] {
  return [
    {
      id: 'workspace.openCommandPalette',
      title: 'Open command palette',
      category: 'Workspace',
      description: 'Search and execute commands from the workbench.',
      group: 'workspace',
      keywords: ['palette', 'command', 'action'],
      priority: 20,
      scope: 'global',
      shortcut: 'Ctrl+P',
      run: openCommandPalette,
    },
    {
      id: 'workspace.closeCommandPalette',
      title: 'Close command palette',
      category: 'Workspace',
      description: 'Close the command palette overlay.',
      group: 'workspace',
      scope: 'dialog',
      shortcut: 'Escape',
      visibleInPalette: false,
      run: closeCommandPalette,
    },
    {
      id: 'workspace.quickOpen',
      title: 'Quick open',
      category: 'Workspace',
      description: 'Open sessions, paths, and workbench targets quickly.',
      group: 'workspace',
      shortcut: 'Ctrl+O',
      run: openQuickOpen,
    },
    {
      id: 'session.createQuick',
      title: 'Create quick SSH session',
      category: 'Session',
      description: 'Create a temporary SSH session and connect immediately.',
      group: 'session',
      shortcut: 'Ctrl+N',
      async run() {
        const session = createSession('quick-session')
        await connectSession(session)
      },
    },
    {
      id: 'session.importSshConfig',
      title: 'Import SSH config',
      category: 'Session',
      description: 'Import hosts from the local SSH config file.',
      group: 'session',
      keywords: ['ssh', 'config', 'hosts'],
      async run() {
        await importSshConfigSessions()
      },
    },
    {
      id: 'terminal.search',
      title: 'Search terminal output',
      category: 'Terminal',
      description: 'Toggle search in the active terminal buffer.',
      group: 'terminal',
      shortcut: 'Ctrl+F',
      run: toggleTerminalSearch,
    },
    {
      id: 'terminal.reconnectActive',
      title: 'Reconnect active terminal',
      category: 'Terminal',
      description: 'Reconnect the active terminal tab and flush queued input.',
      group: 'terminal',
      keywords: ['ssh', 'connect', 'retry'],
      disabledReason: () => getActiveTerminal() ? null : 'No active terminal',
      run: async () => {
        const tab = getActiveTerminal()
        if (tab) await reconnectTerminalTab(tab)
      },
    },
    {
      id: 'terminal.broadcastCommand',
      title: 'Broadcast command',
      category: 'Terminal',
      description: 'Send one command to all connected terminal tabs.',
      group: 'terminal',
      keywords: ['multi', 'all', 'send'],
      disabledReason: () => terminalState.tabs.some((tab) => tab.status === 'connected') ? null : 'No connected terminals',
      run: async () => {
        const command = await requestPrompt({title: 'Broadcast command', label: 'Command', confirmLabel: 'Broadcast'})
        if (command) await broadcastTerminalCommand(command)
      },
    },
    {
      id: 'workspace.openSessionsPanel',
      title: 'Open Sessions panel',
      category: 'Workspace',
      description: 'Show the sessions explorer in the sidebar.',
      group: 'workspace',
      run: () => switchPanel('sessions'),
    },
    {
      id: 'sftp.openPanel',
      title: 'Open SFTP panel',
      category: 'SFTP',
      description: 'Show remote file browsing and transfer controls.',
      group: 'sftp',
      run: () => switchPanel('sftp'),
    },
    {
      id: 'workspace.openTasksPanel',
      title: 'Open Tasks panel',
      category: 'Workspace',
      description: 'Show running and completed background tasks.',
      group: 'workspace',
      run: () => switchPanel('tasks'),
    },
    {
      id: 'workspace.openSearchPanel',
      title: 'Open Search panel',
      category: 'Workspace',
      description: 'Show the global search panel in the sidebar.',
      group: 'workspace',
      run: () => switchPanel('search'),
    },
    {
      id: 'workspace.openLogsPanel',
      title: 'Open Logs panel',
      category: 'Workspace',
      description: 'Show application logs in the bottom panel.',
      group: 'workspace',
      keywords: ['errors', 'diagnostics', 'debug'],
      run: openLogsPanel,
    },
    {
      id: 'workspace.openProblemsPanel',
      title: 'Open Problems panel',
      category: 'Workspace',
      description: 'Show warning and error logs grouped by severity.',
      group: 'workspace',
      keywords: ['errors', 'warnings', 'diagnostics'],
      run: () => openDockPanel('problems', 'bottom'),
    },
    {
      id: 'workspace.openOutputPanel',
      title: 'Open Output panel',
      category: 'Workspace',
      description: 'Show output channels in the bottom panel.',
      group: 'workspace',
      keywords: ['output', 'channels', 'debug'],
      run: () => openDockPanel('output', 'bottom'),
    },
    {
      id: 'workspace.openSessionDetail',
      title: 'Open Session Detail',
      category: 'Workspace',
      description: 'Show active session metadata in the right dock.',
      group: 'workspace',
      keywords: ['session', 'details', 'right dock'],
      run: () => openDockPanel('session-detail', 'right'),
    },
    {
      id: 'workspace.openSftpItemDetail',
      title: 'Open SFTP Item Detail',
      category: 'SFTP',
      description: 'Show selected remote file or directory details in the right dock.',
      group: 'sftp',
      keywords: ['file', 'details', 'right dock'],
      run: () => openDockPanel('sftp-item-detail', 'right'),
    },
    {
      id: 'workspace.openTaskDetail',
      title: 'Open Task Detail',
      category: 'Workspace',
      description: 'Show task details in the right dock.',
      group: 'workspace',
      keywords: ['task', 'details', 'right dock'],
      run: () => openDockPanel('task-detail', 'right'),
    },
    {
      id: 'workspace.openTerminalInfo',
      title: 'Open Terminal Info',
      category: 'Terminal',
      description: 'Show active terminal runtime details in the right dock.',
      group: 'terminal',
      keywords: ['terminal', 'details', 'right dock'],
      run: () => openDockPanel('terminal-info', 'right'),
    },
    {
      id: 'settings.openPanel',
      title: 'Open Settings',
      category: 'Settings',
      description: 'Open Settings in the main workbench area.',
      group: 'settings',
      shortcut: 'Ctrl+,',
      run: () => {
        workspaceState.activePanel = 'settings'
        openWorkspaceTab({id: 'settings', kind: 'settings', title: 'Settings', subtitle: 'Preferences', closable: true})
        switchMainView('settings')
      },
    },
    {
      id: 'workspace.switchTerminal',
      title: 'Switch terminal tab',
      group: 'workspace',
      run: (payload) => {
        if (typeof payload === 'string') switchTerminal(payload)
      },
    },
    {
      id: 'settings.toggleTheme',
      title: 'Toggle theme',
      category: 'Settings',
      description: 'Switch between dark and light themes.',
      group: 'settings',
      keywords: ['appearance', 'dark', 'light'],
      run: () => switchTheme(workspaceState.theme === 'dark' ? 'light' : 'dark'),
    },
  ]
}

function getActiveTerminal() {
  return terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId) ?? null
}
