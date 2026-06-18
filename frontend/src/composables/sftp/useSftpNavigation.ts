import { ref } from 'vue'

export function useSftpNavigation(openPath: (path: string, options?: { recordHistory?: boolean }) => void | Promise<void>) {
  const sftpPathHistory = ref<string[]>(['/'])
  const sftpPathHistoryIndex = ref(0)

  function navigateSftpBack() {
    if (sftpPathHistoryIndex.value > 0) {
      sftpPathHistoryIndex.value--
      void openPath(sftpPathHistory.value[sftpPathHistoryIndex.value], { recordHistory: false })
    }
  }

  function navigateSftpForward() {
    if (sftpPathHistoryIndex.value < sftpPathHistory.value.length - 1) {
      sftpPathHistoryIndex.value++
      void openPath(sftpPathHistory.value[sftpPathHistoryIndex.value], { recordHistory: false })
    }
  }

  function pushSftpPath(path: string) {
    if (sftpPathHistory.value[sftpPathHistoryIndex.value] === path) {
      return
    }

    sftpPathHistory.value = sftpPathHistory.value.slice(0, sftpPathHistoryIndex.value + 1)
    sftpPathHistory.value.push(path)
    sftpPathHistoryIndex.value = sftpPathHistory.value.length - 1
  }

  function resetSftpHistory(path = '/') {
    sftpPathHistory.value = [path]
    sftpPathHistoryIndex.value = 0
  }

  return {
    sftpPathHistory,
    sftpPathHistoryIndex,
    navigateSftpBack,
    navigateSftpForward,
    pushSftpPath,
    resetSftpHistory,
  }
}
