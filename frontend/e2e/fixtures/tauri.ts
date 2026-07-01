/// <reference path="../global.d.ts" />

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
    const listeners = new Map<string, Set<number>>()
    const invocationLog: Array<{command: string; args?: Record<string, unknown>}> = []
    let callbackId = 0
    let connectError: string | null = null

    const sftpEntries = [
      {name: 'logs', path: '/srv/logs', isDirectory: true, size: 0, modified: Math.floor(Date.now() / 1000)},
      {name: 'app.tar.gz', path: '/srv/releases/app.tar.gz', isDirectory: false, size: 73400320, modified: Math.floor(Date.now() / 1000)},
      {name: '.env', path: '/srv/app/.env', isDirectory: false, size: 2048, modified: Math.floor(Date.now() / 1000)},
      ...Array.from({length: 420}, (_unused, index) => {
        const item = index + 1
        return {
          name: `file-${String(item).padStart(3, '0')}.log`,
          path: `/srv/logs/file-${String(item).padStart(3, '0')}.log`,
          isDirectory: false,
          size: 1024 + item,
          modified: Math.floor(Date.now() / 1000),
        }
      }),
    ]

    function addListener(eventName: string, eventId: number) {
      if (!listeners.has(eventName)) listeners.set(eventName, new Set())
      listeners.get(eventName)?.add(eventId)
    }

    function removeListener(eventId: number) {
      listeners.forEach((ids) => ids.delete(eventId))
    }

    function emitEvent(eventName: string, payload: unknown) {
      const ids = listeners.get(eventName)
      if (!ids) return
      ids.forEach((id) => {
        const callback = callbacks.get(id)
        if (callback) callback({event: eventName, id, payload})
      })
    }

    function resolveSftpOffset(args?: Record<string, unknown>) {
      const cursor = typeof args?.cursor === 'string' ? args.cursor : null
      if (cursor?.startsWith('offset:')) {
        const cursorValue = Number.parseInt(cursor.slice('offset:'.length), 10)
        if (!Number.isNaN(cursorValue)) return cursorValue
      }
      const offset = Number(args?.offset ?? 0)
      return Number.isNaN(offset) ? 0 : Math.max(0, offset)
    }

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
        invocationLog.push({command, args})

        if (command === 'plugin:event|listen') {
          const eventName = String(args?.event ?? '')
          const handlerId = Number(args?.handler ?? callbackId)
          if (eventName && !Number.isNaN(handlerId)) addListener(eventName, handlerId)
          return Promise.resolve(handlerId)
        }

        if (command === 'plugin:event|unlisten') {
          const eventId = Number(args?.eventId)
          callbacks.delete(eventId)
          removeListener(eventId)
          return Promise.resolve()
        }

        if (command === 'mock:event:emit') {
          emitEvent(String(args?.eventName ?? ''), args?.payload)
          return Promise.resolve()
        }

        if (command === 'mock:setConnectError') {
          connectError = typeof args?.message === 'string' ? args.message : null
          return Promise.resolve()
        }

        if (command === 'mock:getInvocations') {
          return Promise.resolve(invocationLog)
        }

        if (command === 'load_session_tree') {
          return Promise.resolve(mockSessionTree)
        }

        if (command === 'connect_ssh') {
          if (connectError) return Promise.reject(new Error(connectError))
          return Promise.resolve(`backend-${String(args?.host ?? 'session')}`)
        }

        if (command === 'test_ssh_connection') {
          return Promise.resolve(`Connected to ${String(args?.username)}@${String(args?.host)}:${String(args?.port)}`)
        }

        if (command === 'tcp_latency') {
          return Promise.resolve(42)
        }

        if (command === 'known_hosts_path' || command === 'open_known_hosts') {
          return Promise.resolve('/home/test/.ssh/known_hosts')
        }

        if (command === 'list_sftp_tasks') {
          return Promise.resolve([
            {taskId: 'sftp-upload-app', kind: 'upload', title: 'Upload app.tar.gz', detail: '/srv/releases/app.tar.gz', status: 'running', transferredBytes: 62, totalBytes: 100, error: null, updatedAtMs: 3},
            {taskId: 'sftp-download-log', kind: 'download', title: 'Download app.log', detail: '/var/log/app.log', status: 'failed', transferredBytes: 20, totalBytes: 100, error: 'Connection reset by peer', updatedAtMs: 2},
            {taskId: 'sftp-upload-env', kind: 'upload', title: 'Upload .env', detail: '/srv/app/.env', status: 'done', transferredBytes: 100, totalBytes: 100, error: null, updatedAtMs: 1}
          ])
        }

        if (command === 'list_background_tasks') {
          return Promise.resolve([
            {taskId: 'sftp-upload-app', kind: 'sftp.upload', title: 'Upload app.tar.gz', detail: '/srv/releases/app.tar.gz', status: 'running', progress: {transferredBytes: 62, totalBytes: 100}, error: null, updatedAtMs: 3},
            {taskId: 'sftp-download-log', kind: 'sftp.download', title: 'Download app.log', detail: '/var/log/app.log', status: 'failed', progress: {transferredBytes: 20, totalBytes: 100}, error: 'Connection reset by peer', updatedAtMs: 2},
            {taskId: 'sftp-upload-env', kind: 'sftp.upload', title: 'Upload .env', detail: '/srv/app/.env', status: 'done', progress: {transferredBytes: 100, totalBytes: 100}, error: null, updatedAtMs: 1}
          ])
        }

        if (command === 'sftp_list') {
          const offset = resolveSftpOffset(args)
          const requestedLimit = Number(args?.limit ?? sftpEntries.length)
          const limit = Number.isNaN(requestedLimit) || requestedLimit <= 0 ? sftpEntries.length : requestedLimit
          return Promise.resolve(sftpEntries.slice(offset, offset + limit))
        }

        if (command === 'sftp_read_file') {
          return Promise.resolve(btoa('KEY=value\n'))
        }

        if (command === 'sftp_create_file' || command === 'sftp_mkdir' || command === 'sftp_rename' || command === 'sftp_delete' || command === 'sftp_upload' || command === 'sftp_upload_directory' || command === 'sftp_download' || command === 'cancel_background_task') {
          return Promise.resolve()
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
