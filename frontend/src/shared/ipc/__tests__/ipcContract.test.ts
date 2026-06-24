import {describe, expect, it} from 'vitest'
import {backendCommandNames} from '../generated/backendCommands'
import {ipcCommandNames, type IpcCommandMap} from '../ipcContract'

const typedBackendCommandNames = backendCommandNames satisfies readonly (keyof IpcCommandMap)[]

describe('ipc contract', () => {
  it('keeps frontend command map aligned with backend command names', () => {
    expect([...ipcCommandNames].sort()).toEqual([...typedBackendCommandNames].sort())
  })

  it('does not contain duplicate command names', () => {
    expect(new Set(ipcCommandNames).size).toBe(ipcCommandNames.length)
  })
})
