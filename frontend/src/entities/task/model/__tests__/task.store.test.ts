import {afterEach, describe, expect, it} from 'vitest'
import {addTask, clearSettledTasks, patchTask, taskItems, upsertTask} from '../task.store'

describe('task store', () => {
  afterEach(() => {
    taskItems.splice(0, taskItems.length)
  })

  it('clears completed and cancelled tasks while keeping actionable tasks', () => {
    taskItems.push(
      {id: 'running', title: 'Upload app', detail: '/srv/app', progress: 20, status: 'running'},
      {id: 'failed', title: 'Download log', detail: '/srv/app.log', progress: 40, status: 'failed'},
      {id: 'done', title: 'Upload env', detail: '/srv/.env', progress: 100, status: 'done'},
      {id: 'cancelled', title: 'Download dump', detail: '/srv/dump.sql', progress: 10, status: 'cancelled'},
    )

    clearSettledTasks()

    expect(taskItems.map((task) => task.id)).toEqual(['running', 'failed'])
  })

  it('updates tasks through an id index and recovers after external array changes', () => {
    addTask({id: 'task-1', title: 'Upload app', detail: '/srv/app', progress: 10, status: 'running'})
    patchTask('task-1', {progress: 40})

    expect(taskItems[0].progress).toBe(40)

    taskItems.splice(0, taskItems.length, {id: 'task-2', title: 'Download log', detail: '/srv/app.log', progress: 0, status: 'running'})
    upsertTask({id: 'task-2', title: 'Download log', detail: '/srv/app.log', progress: 75, status: 'running'})

    expect(taskItems).toHaveLength(1)
    expect(taskItems[0]).toMatchObject({id: 'task-2', progress: 75})
  })
})
