import {markRaw} from 'vue'
import {Wifi} from '@lucide/vue'
import {registerRightSidebarPanel} from '../../features/workspace/right-sidebar-panel-registry'
import SessionConnectionInfo from '../../widgets/session-connection-info/ui/SessionConnectionInfo.vue'

export function registerDefaultRightSidebarPanels() {
  const disposable = registerRightSidebarPanel({
    id: 'connection-info',
    title: 'Connection Info',
    icon: markRaw(Wifi),
    order: 10,
    tooltip: 'Session connection information',
    component: markRaw(SessionConnectionInfo),
  })
  return () => disposable()
}
