import {reactive} from 'vue'
import type {SftpItem} from './sftp.types'

export const sftpState = reactive({
  path: '/',
  loading: false,
  error: '',
  selectedItemId: '',
  items: [] as SftpItem[],
})

export function setSftpItems(path: string, items: SftpItem[]) {
  sftpState.path = path
  sftpState.items = items
}
