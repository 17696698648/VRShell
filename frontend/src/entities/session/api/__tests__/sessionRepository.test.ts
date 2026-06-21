import {afterEach, describe, expect, it, vi} from 'vitest'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {applySessionTreeAction, createSessionHostAction, deleteSessionHostAction} from '../sessionRepository'

describe('sessionRepository', () => {
  afterEach(() => {
    setIpcMock(null)
  })

  it('sends typed session tree action payload', async () => {
    const mock = vi.fn(async (_command, args) => ({
      action: (args as {action: string}).action,
      targetType: (args as {targetType: string}).targetType,
      targetId: (args as {targetId: string}).targetId,
      message: 'ok',
    }))
    setIpcMock(mock)

    const payload = createSessionHostAction({
      id: 'host-1',
      name: 'Prod',
      user: 'deploy',
      address: 'prod.example.com',
      port: 22,
      authMethod: 'key',
    }, 'root')
    const result = await applySessionTreeAction(payload)

    expect(mock).toHaveBeenCalledWith('apply_session_tree_action', payload)
    expect(result).toEqual({action: 'create', targetType: 'host', targetId: 'host-1', message: 'ok'})
  })

  it('creates delete host payload', () => {
    expect(deleteSessionHostAction('host-1')).toEqual({
      action: 'delete',
      targetType: 'host',
      targetId: 'host-1',
    })
  })
})
