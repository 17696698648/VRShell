import {describe, expect, it} from 'vitest'
import {messages} from '../messages'

describe('messages contract', () => {
  it('keeps SFTP feedback copy available', () => {
    expect(messages.sftp.explorer.title).toBe('SFTP')
    expect(messages.sftp.explorer.unableToLoadDirectory).toBe('Unable to load remote directory')
    expect(messages.sftp.toolbar.actions).toBe('SFTP actions')
    expect(messages.sftp.treeGrid.columns.name).toBe('Name')
    expect(messages.sftp.taskMiniPanel.title).toBe('Transfers')
    expect(messages.sftp.directoryTree.expandFailed('/root', 'denied')).toBe('Failed to expand /root: denied')
    expect(messages.sftp.failures.transfer('upload')).toBe('Upload failed')
    expect(messages.sftp.dialogs.deleteMessage('/tmp/app.log')).toContain('/tmp/app.log')
  })

  it('keeps terminal, session, task, and app failure copy available', () => {
    expect(messages.terminal.failures.outputStopped('prod')).toBe('Terminal output stopped for prod')
    expect(messages.session.failures.connect('prod')).toBe('Failed to connect prod')
    expect(messages.task.actions.copyError).toBe('Copy error')
    expect(messages.task.failures.cancel('Upload file')).toBe('Failed to cancel Upload file')
    expect(messages.app.errors.boundary).toBe('Application error')
  })
})
