import {describe, expect, it} from 'vitest'
import source from '../SftpExplorer.vue?raw'

describe('SftpExplorer body state contract', () => {
  it('routes error loading empty and disconnected states through one state model', () => {
    expect(source).toContain("import {getSftpBodyState} from '../model/sftpBodyState'")
    expect(source).toContain('const sftpBodyState = computed(() => getSftpBodyState({')
    expect(source).toContain('activeSession: hasConnectedTerminal.value')
    expect(source).toContain('itemCount: sftpState.items.length')
  })

  it('uses shared error and empty-state components for non-ready states', () => {
    expect(source).toContain('v-if="sftpBodyState.kind === \'error\'"')
    expect(source).toContain('v-else-if="sftpBodyState.kind === \'empty\' || sftpBodyState.kind === \'disconnected\'"')
    expect(source).toContain(':title="sftpBodyState.title"')
    expect(source).toContain(':description="sftpBodyState.description"')
  })

  it('offers the shared reconnect action for disconnected sessions', () => {
    expect(source).toContain('sftpBodyState.kind === \'disconnected\' && activeSession')
    expect(source).toContain("executeCommand('session.reconnect'")
    expect(source).toContain('messages.reconnect.action')
  })
})
