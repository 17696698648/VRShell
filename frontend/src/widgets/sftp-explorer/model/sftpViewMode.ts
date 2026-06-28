import {ref, watch} from 'vue'

export const sftpViewModes = ['tree', 'list'] as const
export type SftpViewMode = (typeof sftpViewModes)[number]

const storageKey = 'vrshell-sftp-view-mode'

const viewMode = ref<SftpViewMode>(restoreViewMode())

watch(viewMode, (mode) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, mode)
  } catch {
    void mode
  }
})

export function useSftpViewMode() {
  return {viewMode}
}

function restoreViewMode(): SftpViewMode {
  try {
    const storedMode = typeof localStorage === 'undefined' ? null : localStorage.getItem(storageKey)
    return isSftpViewMode(storedMode) ? storedMode : 'tree'
  } catch {
    return 'tree'
  }
}

function isSftpViewMode(value: string | null): value is SftpViewMode {
  return sftpViewModes.includes(value as SftpViewMode)
}
