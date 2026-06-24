import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {sessionState} from '../../../../entities/session'
import {addTask, taskItems} from '../../../../entities/task'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {cancelTask, restoreSftpTasks, retryTask} from '../manageTask'

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(async () => '/tmp/file'),
}))

const defaultTasks = JSON.parse(JSON.stringify(taskItems)) as typeof taskItems
const defaultSessions = [{id: 'session-test', name: 'session-test', host: 'example.com', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'connected', auth: {type: 'agent'}, backendSessionId: 'backend-test'}] as typeof sessionState.sessions

describe('manageTask', () => {
  beforeEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    sessionState.activeSessionId = 'session-test'
  })

  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    taskItems.splice(0, taskItems.length, ...JSON.parse(JSON.stringify(defaultTasks)))
    sessionState.sessions.splice(0, sessionState.sessions.length)
    sessionState.activeSessionId = ''
  })

  it('restores SFTP tasks from backend snapshots', async () => {
    setIpcMock(async (command) => {
      if (command === 'list_sftp_tasks') {
        return [
          {taskId: 'download-task', kind: 'download', title: 'Download file', detail: '/srv/app.log', status: 'running', transferredBytes: 25, totalBytes: 100, error: null, updatedAtMs: 2},
          {taskId: 'failed-task', kind: 'upload', title: 'Upload file', detail: '/srv/app.env', status: 'failed', transferredBytes: 0, totalBytes: null, error: 'network lost', updatedAtMs: 1},
        ]
      }
      return undefined
    })

    await expect(restoreSftpTasks()).resolves.toBe(2)

    expect(taskItems.find((task) => task.id === 'download-task')).toMatchObject({title: 'Download file', detail: '/srv/app.log', progress: 25, status: 'running'})
    expect(taskItems.find((task) => task.id === 'failed-task')).toMatchObject({title: 'Upload file', detail: '/srv/app.env', error: 'network lost', progress: 0, status: 'failed'})
  })

  it('cancels running SFTP tasks through typed IPC', async () => {
    addTask({id: 'task', title: 'Download file', detail: '/tmp/file', progress: 50, status: 'running'})
    let payload: unknown = null
    setIpcMock(async (command, args) => {
      if (command === 'cancel_sftp_task') payload = args
      return undefined
    })

    await expect(cancelTask(taskItems[0])).resolves.toBe(true)

    expect(payload).toEqual({taskId: 'task'})
    expect(taskItems[0].status).toBe('cancelled')
    expect(feedbackState.toasts).toHaveLength(0)
  })

  it('reports cancel failures', async () => {
    addTask({id: 'task', title: 'Download file', detail: '/tmp/file', progress: 50, status: 'running'})
    setIpcMock(async (command) => {
      if (command === 'cancel_sftp_task') throw new Error('cancel failed')
      return undefined
    })

    await expect(cancelTask(taskItems[0])).rejects.toThrow('cancel_sftp_task failed: cancel failed')
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: 'Failed to cancel Download file'})
  })

  it('retries failed transfer tasks', async () => {
    addTask({id: 'task', title: 'Download file', detail: '/tmp/file', error: 'previous failure', progress: 50, status: 'failed'})

    const retryTaskId = await retryTask(taskItems[0])

    expect(retryTaskId).toBeTruthy()
    expect(taskItems.find((task) => task.id === 'task')?.error).toBeUndefined()
    expect(taskItems[0]).toMatchObject({id: retryTaskId, title: 'Download file', status: 'done'})
  })
})
