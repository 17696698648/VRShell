import {afterEach, describe, expect, it} from 'vitest'
import {terminalState} from '../../../../entities/terminal'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {getTerminalDimensions, resizeTerminal} from '../resizeTerminal'

describe('resizeTerminal', () => {
  afterEach(() => {
    setIpcMock(null)
    clearToasts()
  })

  it('calculates bounded terminal dimensions', () => {
    expect(getTerminalDimensions({width: 900, height: 440})).toEqual({cols: 100, rows: 20})
    expect(getTerminalDimensions({width: 1, height: 1})).toEqual({cols: 20, rows: 4})
  })

  it('sends resize requests through typed IPC', async () => {
    const tab = terminalState.tabs[0]
    let payload: unknown = null
    setIpcMock(async (command, args) => {
      if (command === 'resize_pty') payload = args
      return undefined
    })

    await resizeTerminal(tab, {width: 900, height: 440})

    expect(payload).toEqual({sessionId: tab.backendSessionId, cols: 100, rows: 20})
  })

  it('reports resize failures', async () => {
    const tab = terminalState.tabs[0]
    setIpcMock(async (command) => {
      if (command === 'resize_pty') throw new Error('resize failed')
      return undefined
    })

    await expect(resizeTerminal(tab, {width: 900, height: 440})).rejects.toThrow('resize_pty failed: resize failed')

    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: `Failed to resize ${tab.title}`})
  })
})
