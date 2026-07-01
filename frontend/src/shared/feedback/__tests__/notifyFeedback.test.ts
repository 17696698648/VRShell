import {afterEach, describe, expect, it} from 'vitest'
import {IpcError} from '../../ipc/ipcErrors'
import {clearLogs, logState} from '../../lib/logger'
import {clearToasts, feedbackState} from '../feedbackStore'
import {notifyAppError} from '../notifyFeedback'

describe('notifyFeedback', () => {
  afterEach(() => {
    clearToasts()
    clearLogs()
  })

  it('uses app error metadata for toast and log entries', () => {
    const error = new IpcError('connect_ssh', {
      code: 'hostKeyChanged',
      kind: 'security',
      message: 'Host key changed',
      recoverable: false,
    })

    notifyAppError(error, {title: 'Connection failed', action: 'connect-session'})

    expect(feedbackState.toasts).toHaveLength(1)
    expect(feedbackState.toasts[0]).toMatchObject({
      detail: 'Host key changed',
      level: 'error',
      recoverable: false,
      severity: 'fatal',
      source: 'ssh',
      timeoutMs: null,
      title: 'Connection failed',
    })
    expect(logState.entries[0]).toMatchObject({
      detail: 'Host key changed',
      level: 'fatal',
      message: 'Connection failed',
      source: 'ssh',
    })
  })

  it('appends trace ids to app error details', () => {
    notifyAppError(new Error('transfer failed'), {title: 'Upload failed', traceId: 'task:sftp-upload'})

    expect(feedbackState.toasts[0].detail).toBe('transfer failed\nTrace ID: task:sftp-upload')
    expect(logState.entries[0].detail).toBe('transfer failed\nTrace ID: task:sftp-upload')
  })
})
