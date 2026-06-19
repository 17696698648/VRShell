import { listen } from '@tauri-apps/api/event'
import { onMounted, onUnmounted } from 'vue'

type AppLifecycleOptions<TSftpProgressPayload> = {
  applySftpTaskProgress: (payload: TSftpProgressPayload) => void
  disconnectAllSessionsBeforeExit: () => void
  loadBookmarks: () => void
  loadPersistedSessionTree: () => void
  registerTauriDragDrop: () => void
  restoreUiState: () => void
  saveUiState: () => void
  stopPersistence: () => void
  unregisterTauriDragDrop: () => void
}

export function createAppLifecycleHandlers<TSftpProgressPayload>({
  applySftpTaskProgress,
  disconnectAllSessionsBeforeExit,
  loadBookmarks,
  loadPersistedSessionTree,
  registerTauriDragDrop,
  restoreUiState,
  saveUiState,
  stopPersistence,
  unregisterTauriDragDrop,
}: AppLifecycleOptions<TSftpProgressPayload>) {
  let unlistenSftpProgress: (() => void) | null = null
  let registerSftpProgressPromise: Promise<void> | null = null

  async function registerSftpProgressListener() {
    if (unlistenSftpProgress) return
    if (registerSftpProgressPromise) return registerSftpProgressPromise

    registerSftpProgressPromise = listen('sftp-progress', (event) => {
      applySftpTaskProgress(event.payload as TSftpProgressPayload)
    })
      .then((unlisten) => {
        unlistenSftpProgress = unlisten
      })
      .catch((error) => {
        console.warn('register sftp progress failed:', error)
      })
      .finally(() => {
        registerSftpProgressPromise = null
      })

    return registerSftpProgressPromise
  }

  function mount() {
    restoreUiState()
    loadBookmarks()
    loadPersistedSessionTree()
    registerTauriDragDrop()
    void registerSftpProgressListener()
    window.addEventListener('beforeunload', disconnectAllSessionsBeforeExit)
  }

  function unmount() {
    saveUiState()
    stopPersistence()
    window.removeEventListener('beforeunload', disconnectAllSessionsBeforeExit)
    unlistenSftpProgress?.()
    unlistenSftpProgress = null
    unregisterTauriDragDrop()
    disconnectAllSessionsBeforeExit()
  }

  return {
    mount,
    registerSftpProgressListener,
    unmount,
  }
}

export function useAppLifecycle<TSftpProgressPayload>(options: AppLifecycleOptions<TSftpProgressPayload>) {
  const handlers = createAppLifecycleHandlers(options)

  onMounted(handlers.mount)
  onUnmounted(handlers.unmount)

  return {
    registerSftpProgressListener: handlers.registerSftpProgressListener,
  }
}

