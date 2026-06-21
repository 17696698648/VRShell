import {markRaw} from 'vue'
import {registerDockPanel} from '../../features/workspace/dock-registry'
import {LogsPanel} from '../../widgets/logs-panel'
import {OutputPanel} from '../../widgets/output-panel'
import {ProblemsPanel} from '../../widgets/problems-panel'
import {SessionDetailPanel} from '../../widgets/session-detail'
import {SftpItemDetailPanel} from '../../widgets/sftp-item-detail'
import {TaskDetailPanel} from '../../widgets/task-detail'
import {TerminalInfoPanel} from '../../widgets/terminal-info'

export function registerDefaultDockPanels() {
  const disposables = [
    registerDockPanel({id: 'problems', title: 'Problems', icon: '!', order: 10, placement: 'bottom', preferredSize: 220, component: markRaw(ProblemsPanel)}),
    registerDockPanel({id: 'output', title: 'Output', icon: '▣', order: 20, placement: 'bottom', preferredSize: 240, component: markRaw(OutputPanel)}),
    registerDockPanel({id: 'logs', title: 'Logs', icon: '☰', order: 30, placement: 'bottom', preferredSize: 240, component: markRaw(LogsPanel)}),
    registerDockPanel({id: 'session-detail', title: 'Session Detail', icon: 'SSH', order: 10, placement: 'right', preferredSize: 340, component: markRaw(SessionDetailPanel)}),
    registerDockPanel({id: 'sftp-item-detail', title: 'SFTP Detail', icon: '⇄', order: 20, placement: 'right', preferredSize: 340, component: markRaw(SftpItemDetailPanel)}),
    registerDockPanel({id: 'task-detail', title: 'Task Detail', icon: 'TASK', order: 30, placement: 'right', preferredSize: 340, component: markRaw(TaskDetailPanel)}),
    registerDockPanel({id: 'terminal-info', title: 'Terminal Info', icon: 'TERM', order: 40, placement: 'right', preferredSize: 340, component: markRaw(TerminalInfoPanel)}),
  ]
  return () => disposables.forEach((dispose) => dispose())
}
