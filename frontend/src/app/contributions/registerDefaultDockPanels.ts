import {markRaw} from 'vue'
import {registerDockPanel} from '../../features/workspace/dock-registry'
import {LogsPanel} from '../../widgets/logs-panel'
import TaskCenter from '../../widgets/task-center/ui/TaskCenter.vue'

export function registerDefaultDockPanels() {
  const disposables = [
    registerDockPanel({id: 'logs', title: 'Log Center', icon: 'info', order: 10, placement: 'bottom', preferredSize: 240, component: markRaw(LogsPanel)}),
    registerDockPanel({id: 'tasks', title: 'Task Queue', icon: 'bell-dot', order: 20, placement: 'bottom', preferredSize: 260, component: markRaw(TaskCenter)}),
  ]
  return () => disposables.forEach((dispose) => dispose())
}
