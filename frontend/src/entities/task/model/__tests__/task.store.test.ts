import {afterEach, describe, expect, it} from 'vitest'
import {clearSettledTasks, taskItems} from '../task.store'

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
})
