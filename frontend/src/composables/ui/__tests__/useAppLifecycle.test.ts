import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppLifecycleHandlers } from '../useAppLifecycle'

const mocks = vi.hoisted(() => ({
  listen: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: mocks.listen,
}))

function createHandlers() {
  const calls = {
    applySftpTaskProgress: vi.fn(),
    disconnectAllSessionsBeforeExit: vi.fn(),
    loadBookmarks: vi.fn(),
    loadPersistedSessionTree: vi.fn(),
    registerTauriDragDrop: vi.fn(),
    restoreUiState: vi.fn(),
    saveUiState: vi.fn(),
    stopPersistence: vi.fn(),
    unregisterTauriDragDrop: vi.fn(),
  }
  const handlers = createAppLifecycleHandlers<{ progress: number }>(calls)

  return { calls, handlers }
}

describe('createAppLifecycleHandlers', () => {
  beforeEach(() => {
    mocks.listen.mockReset()
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  it('runs mount setup and registers progress listener once', async () => {
    const unlisten = vi.fn()
    let progressHandler: ((event: { payload: { progress: number } }) => void) | undefined
    mocks.listen.mockImplementation(async (_eventName: string, handler: typeof progressHandler) => {
      progressHandler = handler
      return unlisten
    })
    const { calls, handlers } = createHandlers()

    handlers.mount()
    await vi.waitFor(() => expect(mocks.listen).toHaveBeenCalledWith('sftp-progress', expect.any(Function)))
    await handlers.registerSftpProgressListener()
    progressHandler?.({ payload: { progress: 42 } })

    expect(mocks.listen).toHaveBeenCalledTimes(1)
    expect(calls.restoreUiState).toHaveBeenCalledTimes(1)
    expect(calls.loadBookmarks).toHaveBeenCalledTimes(1)
    expect(calls.loadPersistedSessionTree).toHaveBeenCalledTimes(1)
    expect(calls.registerTauriDragDrop).toHaveBeenCalledTimes(1)
    expect(calls.applySftpTaskProgress).toHaveBeenCalledWith({ progress: 42 })
  })

  it('runs unmount cleanup and releases progress listener', async () => {
    const unlisten = vi.fn()
    mocks.listen.mockResolvedValue(unlisten)
    const { calls, handlers } = createHandlers()

    await handlers.registerSftpProgressListener()
    handlers.unmount()

    expect(calls.saveUiState).toHaveBeenCalledTimes(1)
    expect(calls.stopPersistence).toHaveBeenCalledTimes(1)
    expect(unlisten).toHaveBeenCalledTimes(1)
    expect(calls.unregisterTauriDragDrop).toHaveBeenCalledTimes(1)
    expect(calls.disconnectAllSessionsBeforeExit).toHaveBeenCalledTimes(1)
  })
})
