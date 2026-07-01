import {ref} from 'vue'
import {describe, expect, it} from 'vitest'
import type {TaskItem} from '../../../../entities/task'
import {useTaskCenterSummary} from '../useTaskCenterSummary'

const separator = String.fromCharCode(183)

function task(id: string, status: TaskItem['status']): TaskItem {
  return {id, title: id, detail: `/tmp/${id}`, progress: status === 'running' ? 40 : 100, status}
}

describe('useTaskCenterSummary', () => {
  it('groups running, failed, and settled tasks', () => {
    const tasks = [task('running', 'running'), task('failed', 'failed'), task('done', 'done'), task('cancelled', 'cancelled')]
    const summary = useTaskCenterSummary(tasks)

    expect(summary.runningTasks.value.map((item) => item.id)).toEqual(['running'])
    expect(summary.failedTasks.value.map((item) => item.id)).toEqual(['failed'])
    expect(summary.settledTasks.value.map((item) => item.id)).toEqual(['done', 'cancelled'])
    expect(summary.settledCount.value).toBe(2)
    expect(summary.summaryLabel.value).toBe(`1 running ${separator} 1 failed ${separator} 2 completed`)
  })

  it('updates when reactive task input changes', () => {
    const tasks = ref<TaskItem[]>([task('running', 'running')])
    const summary = useTaskCenterSummary(tasks)

    expect(summary.summaryLabel.value).toBe(`1 running ${separator} 0 failed ${separator} 0 completed`)

    tasks.value = [task('failed', 'failed'), task('done', 'done')]

    expect(summary.summaryLabel.value).toBe(`0 running ${separator} 1 failed ${separator} 1 completed`)
  })
})