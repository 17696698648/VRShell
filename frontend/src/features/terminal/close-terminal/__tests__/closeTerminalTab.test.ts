import {afterEach, describe, expect, it} from 'vitest'
import {enqueueTerminalInput, terminalState} from '../../../../entities/terminal'
import {clearDialogs, dialogState, resolveConfirm} from '../../../../shared/dialog'
import {closeTerminalTab} from '../closeTerminalTab'

const defaultTerminals = JSON.parse(JSON.stringify(terminalState.tabs)) as typeof terminalState.tabs
const defaultActiveTerminalId = terminalState.activeTerminalId

describe('closeTerminalTab', () => {
  afterEach(() => {
    clearDialogs()
    terminalState.tabs.splice(0, terminalState.tabs.length, ...JSON.parse(JSON.stringify(defaultTerminals)))
    terminalState.activeTerminalId = defaultActiveTerminalId
  })

  it('closes disconnected terminals without confirmation', async () => {
    const tab = terminalState.tabs[0]
    tab.status = 'disconnected'

    await expect(closeTerminalTab(tab)).resolves.toBe(true)

    expect(dialogState.confirm).toBeNull()
    expect(terminalState.tabs.some((item) => item.id === tab.id)).toBe(false)
  })

  it('requires confirmation before closing connected terminals', async () => {
    const tab = terminalState.tabs[0]
    const result = closeTerminalTab(tab)

    expect(dialogState.confirm).toMatchObject({title: 'Close terminal'})
    resolveConfirm(false)

    await expect(result).resolves.toBe(false)
    expect(terminalState.tabs.some((item) => item.id === tab.id)).toBe(true)
  })

  it('warns about queued input before closing', async () => {
    const tab = terminalState.tabs[0]
    tab.status = 'disconnected'
    enqueueTerminalInput(tab.id, 'pwd')
    const result = closeTerminalTab(tab)

    expect(dialogState.confirm?.message).toContain('queued input')
    resolveConfirm(true)

    await expect(result).resolves.toBe(true)
    expect(terminalState.tabs.some((item) => item.id === tab.id)).toBe(false)
  })
})
