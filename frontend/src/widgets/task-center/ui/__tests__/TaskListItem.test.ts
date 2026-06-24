import {describe, expect, it} from 'vitest'
import source from '../TaskListItem.vue?raw'

describe('TaskListItem contract', () => {
  it('keeps failed task error controls available', () => {
    expect(source).toContain('errorExpanded')
    expect(source).toContain('copyError')
    expect(source).toContain('messages.task.actions.showError')
    expect(source).toContain('messages.task.actions.copyError')
  })
})
