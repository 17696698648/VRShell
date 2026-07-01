import {afterEach, describe, expect, it} from 'vitest'
import {logMessage, clearLogs} from '../../lib/logger'
import {createDiagnosticBundle, exportDiagnosticBundle, sanitizeDiagnosticText} from '../diagnosticBundle'

describe('diagnostic bundle', () => {
  afterEach(() => {
    clearLogs()
  })

  it('redacts sensitive values in diagnostic text', () => {
    expect(sanitizeDiagnosticText('failed password=secret token=abc passphrase:open')).toBe('failed password=[redacted] token=[redacted] passphrase:[redacted]')
  })

  it('exports sessions, tasks, and logs without raw credentials', () => {
    const sessions = [{
      id: 'session-1',
      name: 'Prod password=secret',
      host: 'example.com',
      port: 22,
      username: 'deploy',
      protocol: 'ssh',
      groupId: 'all',
      tags: [],
      status: 'connected',
      auth: {type: 'password', password: 'secret'},
      backendSessionId: 'backend-1',
    }]
    const tasks = [{id: 'task-1', title: 'Upload', detail: '/srv/app.env', progress: 50, status: 'failed', error: 'token=abc failed', traceId: 'task:task-1'}]
    logMessage({level: 'error', source: 'sftp', message: 'Upload failed', detail: 'password=secret'})

    const bundle = createDiagnosticBundle({sessions, tasks})
    const exported = exportDiagnosticBundle({sessions, tasks})

    expect(bundle.sessions[0]).toMatchObject({authType: 'password', backendSessionId: 'backend-1'})
    expect(bundle.tasks[0]).toMatchObject({traceId: 'task:task-1', error: 'token=[redacted] failed'})
    expect(bundle.logs[0]).toMatchObject({detail: 'password=[redacted]'})
    expect(exported).not.toContain('password":"secret')
    expect(exported).not.toContain('token=abc')
  })
})
