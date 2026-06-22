import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {addSession, removeSession, sessionState, type SessionHost} from '../../../../entities/session'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {importSshConfigSessions} from '../importSshConfigSessions'

const duplicateSession: SessionHost = {id: 'existing-prod-api-01', name: 'prod-api-01', host: '10.0.0.9', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'idle'}

describe('importSshConfigSessions', () => {
  const importedIds: string[] = []

  beforeEach(() => {
    if (!sessionState.sessions.some((session) => session.id === duplicateSession.id)) addSession(JSON.parse(JSON.stringify(duplicateSession)))
  })

  afterEach(() => {
    setIpcMock(null)
    for (const id of importedIds.splice(0)) removeSession(id)
    removeSession(duplicateSession.id)
  })

  it('handles empty mock import without changing sessions', async () => {
    const before = sessionState.sessions.length
    const summary = await importSshConfigSessions()

    expect(summary).toEqual({imported: 0, skipped: 0, total: 0})
    expect(sessionState.sessions.length).toBe(before)
  })

  it('imports only valid non-duplicate hosts', async () => {
    setIpcMock(async (command) => {
      if (command !== 'parse_ssh_config') return undefined
      return [
        {alias: 'new-host', host: 'new-host', hostname: '10.0.0.8', user: 'deploy', port: 22},
        {alias: 'prod-api-01', host: 'prod-api-01', hostname: '10.0.0.9', user: 'deploy', port: 22},
        {alias: 'bad-host', host: 'bad-host', hostname: '', user: '', port: 70000},
      ]
    })

    const summary = await importSshConfigSessions()
    const imported = sessionState.sessions.find((session) => session.name === 'new-host')
    if (imported) importedIds.push(imported.id)

    expect(summary).toEqual({imported: 1, skipped: 2, total: 3})
    expect(imported).toMatchObject({id: 'ssh-new-host', host: '10.0.0.8', username: 'deploy'})
  })
})
