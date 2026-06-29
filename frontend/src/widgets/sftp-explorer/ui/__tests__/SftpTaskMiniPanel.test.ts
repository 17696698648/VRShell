import {describe, expect, it} from 'vitest'
import source from '../SftpTaskMiniPanel.vue?raw'

describe('SftpTaskMiniPanel contract', () => {
  it('keeps transfer queue status and inline actions available', () => {
    expect(source).toContain('summaryLabel')
    expect(source).toContain("executeCommand('workspace.openTasksPanel')")
    expect(source).toContain('cancelTask(task)')
    expect(source).toContain('messages.task.actions.retryUnavailable')
    expect(source).not.toContain('retryTask(task)')
    expect(source).toContain('messages.task.progressLabel')
  })
})
