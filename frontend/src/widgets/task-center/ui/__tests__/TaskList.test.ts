import {describe, expect, it} from 'vitest'
import source from '../TaskList.vue?raw'

describe('TaskList contract', () => {
  it('uses a plain list with a lightweight header', () => {
    expect(source).toContain('class="task-list__header"')
    expect(source).toContain('<TaskListItem v-for="task in tasks"')
    expect(source).not.toContain('UiVirtualList')
  })
})