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
    expect(workspaceState.activePanel).toBe('sftp')
    expect(workspaceState.activeRightDockPanel).toBe('sftp-item-detail')
    expect(workspaceState.rightPanelVisible).toBe(true)
  })

  it('reorders dock panels and resets layout', () => {
    reorderDockPanels('logs', 'problems')
    expect(workspaceState.dockOrder.slice(0, 2)).toEqual(['logs', 'problems'])

    resetWorkspaceLayout()
    expect(workspaceState.layoutPreset).toBe('operations')
  })
})
