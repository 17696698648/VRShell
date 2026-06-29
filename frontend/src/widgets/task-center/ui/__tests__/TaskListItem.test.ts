import {describe, expect, it} from 'vitest'
import source from '../TaskListItem.vue?raw'

describe('TaskListItem contract', () => {
  it('keeps the compact single-row task structure', () => {
    expect(source).toContain('task-item__title')
    expect(source).toContain('task-item__detail')
    expect(source).toContain('task-item__progress')
    expect(source).toContain('task-item__actions')
    expect(source).not.toContain('task-item__main')
    expect(source).not.toContain('task-item__meta')
  })

  it('keeps failed task error controls available', () => {
    expect(source).toContain('errorExpanded')
    expect(source).toContain('copyError')
    expect(source).toContain('messages.task.actions.showError')
    expect(source).toContain('messages.task.actions.copyError')
    expect(source).toContain('messages.task.actions.openLogs')
    expect(source).toContain('messages.task.actions.retryUnavailable')
    expect(source).not.toContain('retryTask')
  })
})
