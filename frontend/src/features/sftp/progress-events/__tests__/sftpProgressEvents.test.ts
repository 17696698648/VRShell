import {afterEach, describe, expect, it} from 'vitest'
import {addTask, taskItems} from '../../../../entities/task'
import {handleSftpCompleted, handleSftpFailed, handleSftpProgress} from '../sftpProgressEvents'

const defaultTasks = JSON.parse(JSON.stringify(taskItems)) as typeof taskItems

describe('sftpProgressEvents', () => {
  afterEach(() => {
    taskItems.splice(0, taskItems.length, ...JSON.parse(JSON.stringify(defaultTasks)))
  })

  it('updates task progress from progress events', () => {
    addTask({id: 'task', title: 'Download file', detail: '/tmp/file', progress: 0, status: 'running'})

    handleSftpProgress({taskId: 'task', transferredBytes: 50, totalBytes: 200})

    expect(taskItems.find((task) => task.id === 'task')).toMatchObject({progress: 25, status: 'running'})
  })

  it('marks tasks done from completed events', () => {
    addTask({id: 'task', title: 'Download file', detail: '/tmp/file', progress: 25, status: 'running'})

    handleSftpCompleted({taskId: 'task', transferredBytes: 200, totalBytes: 200})

    expect(taskItems.find((task) => task.id === 'task')).toMatchObject({progress: 100, status: 'done'})
  })

  it('marks tasks failed from failed events', () => {
    addTask({id: 'task', title: 'Download file', detail: '/tmp/file', progress: 25, status: 'running'})

    handleSftpFailed({taskId: 'task', transferredBytes: 50, totalBytes: 200, error: 'network lost'})

    expect(taskItems.find((task) => task.id === 'task')).toMatchObject({status: 'failed'})
  })
})
