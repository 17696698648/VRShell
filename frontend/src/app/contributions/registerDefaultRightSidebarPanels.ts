import {markRaw} from 'vue'
import {FolderKanban, Gauge} from '@lucide/vue'
import {sftpState} from '../../entities/sftp'
import {registerRightSidebarPanel} from '../../features/workspace/right-sidebar-panel-registry'
import SessionConnectionInfo from '../../widgets/session-connection-info/ui/SessionConnectionInfo.vue'
import SftpExplorer from '../../widgets/sftp-explorer/ui/SftpExplorer.vue'

export function registerDefaultRightSidebarPanels() {
  const disposables = [
    registerRightSidebarPanel({
      id: 'connection-info',
      title: 'Connection Info',
      icon: markRaw(Gauge),
      order: 10,
      tooltip: 'Session connection information',
      component: markRaw(SessionConnectionInfo),
    }),
    registerRightSidebarPanel({
      id: 'sftp',
      title: 'SFTP',
      icon: markRaw(FolderKanban),
      order: 20,
      tooltip: 'Remote file browser',
      commandId: 'sftp.openPanel',
      component: markRaw(SftpExplorer),
      props: {compact: true},
      badge: () => sftpState.error ? {count: 1, intent: 'danger', title: sftpState.error} : undefined,
    }),
  ]
  return () => disposables.forEach((dispose) => dispose())
}
