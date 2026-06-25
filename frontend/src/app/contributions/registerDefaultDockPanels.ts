import {markRaw} from 'vue'
import {registerDockPanel} from '../../features/workspace/dock-registry'
import {LogsPanel} from '../../widgets/logs-panel'

export function registerDefaultDockPanels() {
  const disposables = [
    registerDockPanel({id: 'logs', title: 'Log Center', icon: '☰', order: 10, placement: 'bottom', preferredSize: 240, component: markRaw(LogsPanel)}),
  ]
  return () => disposables.forEach((dispose) => dispose())
}
