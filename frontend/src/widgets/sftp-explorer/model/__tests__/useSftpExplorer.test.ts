import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionState, type SessionHost} from '../../../../entities/session'
import {sftpState} from '../../../../entities/sftp'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {useSftpExplorer} from '../useSftpExplorer'

const activeSession: SessionHost = {id: 'sftp-explorer-session', name: 'SFTP Explorer Session', host: 'example.com', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'connected'}
const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultActiveSessionId = sessionState.activeSessionId
const defaultPath = sftpState.path
const defaultItems = JSON.parse(JSON.stringify(sftpState.items)) as typeof sftpState.items

describe('useSftpExplorer', () => {
  beforeEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, JSON.parse(JSON.stringify(activeSession)))
    sessionState.activeSessionId = activeSession.id
    sftpState.path = '/srv/app'
    sftpState.items.splice(0, sftpState.items.length)
    sftpState.error = ''
    sftpState.loading = false
  })

  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    sessionState.activeSessionId = defaultActiveSessionId
    sftpState.path = defaultPath
    sftpState.items.splice(0, sftpState.items.length, ...JSON.parse(JSON.stringify(defaultItems)))
    sftpState.error = ''
    sftpState.loading = false
  })

  it('refreshes directory items through mock repository', async () => {
    const {refresh} = useSftpExplorer()

    await refresh('/tmp')

    expect(sftpState.path).toBe('/tmp')
    expect(sftpState.items.length).toBeGreaterThan(0)
    expect(sftpState.loading).toBe(false)
  })

  it('reports directory listing failures', async () => {
    const {refresh} = useSftpExplorer()
    setIpcMock(async (command) => {
      if (command === 'sftp_list') throw new Error('permission denied')
      return undefined
    })

    await refresh('/root')

    expect(sftpState.loading).toBe(false)
    expect(sftpState.error).toBe('sftp_list failed: permission denied')
    expect(feedbackState.toasts).toHaveLength(0)
  })
})
