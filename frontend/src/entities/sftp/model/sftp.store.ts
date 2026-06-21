import {reactive} from 'vue'
import type {SftpItem} from './sftp.types'

export const sftpState = reactive({
  path: '/srv/app',
  loading: false,
  error: '',
  selectedItemId: '',
  items: [
    {id: 'dir-logs', name: 'logs', path: '/srv/app/logs', type: 'directory', size: '-', modifiedAt: 'Today'} as SftpItem,
    {id: 'file-env', name: '.env.production', path: '/srv/app/.env.production', type: 'file', size: '2.1 KB', modifiedAt: 'Yesterday'} as SftpItem,
    {id: 'file-release', name: 'release.tar.gz', path: '/srv/app/release.tar.gz', type: 'file', size: '48 MB', modifiedAt: 'Jun 20'} as SftpItem,
  ],
})

export function setSftpItems(path: string, items: SftpItem[]) {
  sftpState.path = path
  sftpState.items = items
}
