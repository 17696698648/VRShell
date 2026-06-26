import {describe, expect, it} from 'vitest'
import source from '../SftpDirectoryTree.vue?raw'

describe('SftpDirectoryTree inline error contract', () => {
  it('shows retry and dismiss actions for expansion failures', () => {
    expect(source).toContain('v-if="treeError"')
    expect(source).toContain('@click="retryTreeError"')
    expect(source).toContain('@click="clearTreeError"')
    expect(source).toContain('treeErrorPath')
  })

  it('stores failed expansion path and retries with force refresh', () => {
    expect(source).toContain('treeErrorPath.value = path')
    expect(source).toContain('treeError.value = messages.sftp.directoryTree.expandFailed(path, getErrorMessage(error))')
    expect(source).toContain('await loadChildren(path, {force: true})')
  })

  it('persists expanded children into the originating session cache', () => {
    expect(source).toContain('const session = props.session')
    expect(source).toContain('if (props.session?.id !== session.id) return')
    expect(source).toContain('persistTreeStateForSession(session.id)')
    expect(source).toContain('getSftpSessionState(sessionId).tree')
  })
})
