import {afterEach, describe, expect, it} from 'vitest'
import {applyLayoutPreset, reorderDockPanels, resetWorkspaceLayout} from '../workspaceLayout.store'
import {workspaceState} from '../workspace.store'

const originalState = JSON.parse(JSON.stringify(workspaceState)) as typeof workspaceState

describe('workspace layout store', () => {
  afterEach(() => {
    Object.assign(workspaceState, JSON.parse(JSON.stringify(originalState)))
  })

  it('applies full layout preset state', () => {
    applyLayoutPreset('file-transfer')

    expect(workspaceState.layoutPreset).toBe('file-transfer')
    expect(workspaceState.activePanel).toBe('sessions')
    expect(workspaceState.activeRightPanel).toBe('sftp')
    expect(workspaceState.rightPanelVisible).toBe(true)
  })

  it('reorders dock panels and resets layout', () => {
    reorderDockPanels('logs', 'logs')
    expect(workspaceState.dockOrder).toEqual(['logs', 'tasks'])

    resetWorkspaceLayout()
    expect(workspaceState.layoutPreset).toBe('operations')
  })
})
