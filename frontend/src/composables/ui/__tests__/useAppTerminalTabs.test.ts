import { computed } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SessionHost } from '../../../components/SessionTreeGroup.vue'
import type { TerminalTab, WorkspaceState } from '../../../types'
import { useAppTerminalTabs } from '../useAppTerminalTabs'

function terminal(id: string, selected = false): TerminalTab {
  return { id, name: id, selected, sessionId: '', status: 'idle', error: '' }
}

function workspace(tabs: TerminalTab[]): WorkspaceState {
  return {
    showEditorArea: false,
    editorPaneHeight: 230,
    sftpPath: '/',
    sftpFiles: [],
    sftpTree: [],
    sftpSearchText: '',
    sftpStatus: '',
    sftpSortKey: 'name',
    sftpSortDirection: 'asc',
    editorTabs: [],
    terminalTabs: tabs,
  }
}

function host(name = 'prod'): SessionHost {
  return {
    name,
    user: 'root',
    address: 'example.com',
    port: 22,
    authMethod: 'password',
    password: '',
    privateKeyPath: '',
    passphrase: '',
    remark: '',
    latency: '-',
    status: 'idle',
    active: true,
  }
}

function createHarness(tabs = [terminal('one', true), terminal('two')]) {
  let idCounter = 0
  const activeSession = computed(() => host())
  const workspaces: Record<string, WorkspaceState> = {
    prod: workspace(tabs),
  }
  const calls = {
    clearTabActivity: vi.fn(),
    copySshCommand: vi.fn(),
    disconnectTerminalRef: vi.fn(),
    onTerminalStatusChange: vi.fn(),
    reconnectTerminalRef: vi.fn(),
    scheduleActiveTerminalFit: vi.fn(),
  }
  const actions = useAppTerminalTabs({
    activeSession,
    activeWorkspace: computed(() => workspaces.prod),
    clearTabActivity: calls.clearTabActivity,
    copySshCommand: calls.copySshCommand,
    createTerminalId: () => `new-${++idCounter}`,
    disconnectTerminalRef: calls.disconnectTerminalRef,
    getWorkspaceState: (sessionName) => workspaces[sessionName],
    onTerminalStatusChange: calls.onTerminalStatusChange,
    reconnectTerminalRef: calls.reconnectTerminalRef,
    scheduleActiveTerminalFit: calls.scheduleActiveTerminalFit,
  })

  return { actions, calls, workspace: workspaces.prod }
}

describe('useAppTerminalTabs', () => {
  it('creates and selects a new terminal tab', () => {
    const { actions, workspace } = createHarness()

    actions.createTerminalTab()

    expect(workspace.terminalTabs.map((item) => item.id)).toEqual(['one', 'two', 'new-1'])
    expect(workspace.terminalTabs.map((item) => item.selected)).toEqual([false, false, true])
  })

  it('selects a terminal and schedules fit', () => {
    const { actions, calls, workspace } = createHarness()

    actions.selectTerminalTab('two')

    expect(workspace.terminalTabs.map((item) => item.selected)).toEqual([false, true])
    expect(calls.scheduleActiveTerminalFit).toHaveBeenCalledWith('two')
  })

  it('updates terminal status and notifies host sync callback', () => {
    const { actions, calls, workspace } = createHarness()

    actions.updateTerminalStatus('prod', 'one', 'error', 'boom')

    expect(workspace.terminalTabs[0]).toMatchObject({ status: 'error', error: 'boom', sessionId: '' })
    expect(calls.onTerminalStatusChange).toHaveBeenCalledWith('prod', 'error')
  })

  it('closes an existing terminal tab and disconnects ref', () => {
    const { actions, calls, workspace } = createHarness()

    actions.closeTerminalTab('one')

    expect(calls.disconnectTerminalRef).toHaveBeenCalledWith('prod', 'one')
    expect(workspace.terminalTabs.map((item) => item.id)).toEqual(['two'])
    expect(workspace.terminalTabs[0].selected).toBe(true)
  })

  it('handles reconnect terminal tab action', () => {
    const { actions, calls } = createHarness()

    actions.applyTerminalTabAction('two', 'reconnect_terminal')

    expect(calls.reconnectTerminalRef).toHaveBeenCalledWith('prod', 'two')
  })
})
