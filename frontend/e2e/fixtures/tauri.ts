import type { Page } from '@playwright/test'

export const emptySessionTree = [
  {
    id: 'all',
    name: 'All',
    icon: '*',
    hosts: [],
    children: []
  }
]

export async function installTauriMock(page: Page, sessionTree = emptySessionTree) {
  await page.addInitScript((mockSessionTree) => {
    const callbacks = new Map<number, (event: unknown) => void>()
    let callbackId = 0

    window.__TAURI_INTERNALS__ = {
      metadata: {
        currentWindow: { label: 'main' },
        currentWebview: { label: 'main' }
      },
      transformCallback(callback: (event: unknown) => void) {
        callbackId += 1
        callbacks.set(callbackId, callback)
        return callbackId
      },
      invoke(command: string, args?: Record<string, unknown>) {
        if (command === 'plugin:event|listen') {
          return Promise.resolve(callbackId)
        }

        if (command === 'plugin:event|unlisten') {
          callbacks.delete(Number(args?.eventId))
          return Promise.resolve()
        }

        if (command === 'load_session_tree') {
          return Promise.resolve(mockSessionTree)
        }

        if (command === 'load_ui_state') {
          return Promise.resolve(null)
        }

        if (command.startsWith('plugin:') || command.startsWith('save_') || command.startsWith('set_')) {
          return Promise.resolve()
        }

        return Promise.resolve(null)
      }
    }
  }, sessionTree)
}
