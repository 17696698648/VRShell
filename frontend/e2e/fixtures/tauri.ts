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

        if (command === 'list_sftp_tasks') {
          return Promise.resolve([
            {taskId: 'sftp-upload-app', kind: 'upload', title: 'Upload app.tar.gz', detail: '/srv/releases/app.tar.gz', status: 'running', transferredBytes: 62, totalBytes: 100, error: null, updatedAtMs: 3},
            {taskId: 'sftp-download-log', kind: 'download', title: 'Download app.log', detail: '/var/log/app.log', status: 'failed', transferredBytes: 20, totalBytes: 100, error: 'Connection reset by peer', updatedAtMs: 2},
            {taskId: 'sftp-upload-env', kind: 'upload', title: 'Upload .env', detail: '/srv/app/.env', status: 'done', transferredBytes: 100, totalBytes: 100, error: null, updatedAtMs: 1}
          ])
        }

        if (command === 'sftp_list') {
          return Promise.resolve([
            {name: 'logs', path: '/srv/logs', is_dir: true, size: 0, modified: Date.now()},
            {name: 'app.tar.gz', path: '/srv/releases/app.tar.gz', is_dir: false, size: 73400320, modified: Date.now()},
            {name: '.env', path: '/srv/app/.env', is_dir: false, size: 2048, modified: Date.now()}
          ])
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
