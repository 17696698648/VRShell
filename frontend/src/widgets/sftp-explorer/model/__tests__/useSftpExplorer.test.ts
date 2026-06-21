import {afterEach, describe, expect, it} from 'vitest'
import {sftpState} from '../../../../entities/sftp'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {useSftpExplorer} from '../useSftpExplorer'

const defaultPath = sftpState.path
const defaultItems = JSON.parse(JSON.stringify(sftpState.items)) as typeof sftpState.items

describe('useSftpExplorer', () => {
  afterEach(() => {
    setIpcMock(null)
    clearToasts()
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
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: 'Failed to list /root'})
  })
})
