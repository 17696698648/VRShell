import {afterEach, describe, expect, it} from 'vitest'
import {addTask, taskItems} from '../../../../entities/task'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {cancelTask, retryTask} from '../manageTask'

const defaultTasks = JSON.parse(JSON.stringify(taskItems)) as typeof taskItems

describe('manageTask', () => {
  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    taskItems.splice(0, taskItems.length, ...JSON.parse(JSON.stringify(defaultTasks)))
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
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'info', title: 'Cancelled Download file'})
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
    addTask({id: 'task', title: 'Download file', detail: '/tmp/file', progress: 50, status: 'failed'})

    const retryTaskId = await retryTask(taskItems[0])

    expect(retryTaskId).toBeTruthy()
    expect(taskItems[0]).toMatchObject({id: retryTaskId, title: 'Download file', status: 'done'})
  })
})
