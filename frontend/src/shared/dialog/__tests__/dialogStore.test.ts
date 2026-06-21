import {afterEach, describe, expect, it} from 'vitest'
import {clearDialogs, dialogState, requestConfirm, requestPrompt, resolveConfirm, resolvePrompt} from '../dialogStore'

describe('dialogStore', () => {
  afterEach(() => clearDialogs())

  it('resolves confirm requests', async () => {
    const result = requestConfirm({title: 'Confirm', message: 'Continue?'})

    expect(dialogState.confirm).toMatchObject({title: 'Confirm', message: 'Continue?', confirmLabel: 'Confirm', cancelLabel: 'Cancel', tone: 'default'})

    resolveConfirm(true)

    await expect(result).resolves.toBe(true)
    expect(dialogState.confirm).toBeNull()
  })

  it('resolves prompt requests', async () => {
    const result = requestPrompt({title: 'Rename', label: 'Name', value: 'prod'})

    expect(dialogState.prompt).toMatchObject({title: 'Rename', label: 'Name', value: 'prod', confirmLabel: 'Save', cancelLabel: 'Cancel'})

    resolvePrompt('prod-api')

    await expect(result).resolves.toBe('prod-api')
    expect(dialogState.prompt).toBeNull()
  })

  it('clears pending dialogs as cancelled', async () => {
    const confirmResult = requestConfirm({title: 'Confirm', message: 'Continue?'})
    const promptResult = requestPrompt({title: 'Rename', label: 'Name'})

    clearDialogs()

    await expect(confirmResult).resolves.toBe(false)
    await expect(promptResult).resolves.toBeNull()
  })
})
