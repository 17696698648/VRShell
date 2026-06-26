import {ref} from 'vue'

export const sftpViewModes = ['tree', 'list'] as const
export type SftpViewMode = (typeof sftpViewModes)[number]

const viewMode = ref<SftpViewMode>('list')

export function useSftpViewMode() {
  return {viewMode}
}
