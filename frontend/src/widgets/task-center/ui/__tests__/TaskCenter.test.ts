import {describe, expect, it} from 'vitest'
import source from '../TaskCenter.vue?raw'

describe('TaskCenter contract', () => {
  it('uses the toolbar trailing slot for clear actions', () => {
    expect(source).toContain('<template #trailing>')
    expect(source).not.toContain('<template #actions>')
    expect(source).toContain('class="task-center__clear"')
  })

  it('renders a single simplified task list', () => {
    expect(source).toContain('class="task-center__list"')
    expect(source).toContain('<TaskList :tasks="tasks" />')
    expect(source).not.toContain('task-center__groups')
    expect(source).not.toContain('runningTasks"')
    expect(source).not.toContain('failedTasks"')
  })

  it('delegates summary counts to the model composable', () => {
    expect(source).toContain("import {useTaskCenterSummary} from '../model/useTaskCenterSummary'")
    expect(source).toContain('const {settledCount, summaryLabel} = useTaskCenterSummary(tasks)')
  })

  it('exposes a copy diagnostics action', () => {
    expect(source).toContain('Copy diagnostics')
    expect(source).toContain('exportDiagnosticBundle')
    expect(source).toContain('navigator.clipboard?.writeText')
    expect(source).toContain('Copied diagnostics')
  })
})
