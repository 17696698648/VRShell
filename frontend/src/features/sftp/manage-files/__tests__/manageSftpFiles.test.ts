import {afterEach, describe, expect, it} from 'vitest'
import {sftpState} from '../../../../entities/sftp'
import {taskItems} from '../../../../entities/task'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {createRemoteDirectory, createTransferTask, deleteRemoteItem, renameRemoteItem} from '../manageSftpFiles'

const defaultItems = JSON.parse(JSON.stringify(sftpState.items)) as typeof sftpState.items
const defaultTasks = JSON.parse(JSON.stringify(taskItems)) as typeof taskItems

describe('manageSftpFiles', () => {
  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    sftpState.items.splice(0, sftpState.items.length, ...JSON.parse(JSON.stringify(defaultItems)))
    taskItems.splice(0, taskItems.length, ...JSON.parse(JSON.stringify(defaultTasks)))
  })

  it('creates remote directories in current path', async () => {
    const item = await createRemoteDirectory('cache')

    expect(item).toMatchObject({name: 'cache', path: `${sftpState.path}/cache`, type: 'directory'})
    expect(sftpState.items[0]).toMatchObject(item!)
  })

  it('renames remote items', async () => {
    const item = sftpState.items[0]

    await renameRemoteItem(item, 'renamed')

    expect(item.name).toBe('renamed')
    expect(item.path).toContain('/renamed')
  })

  it('deletes remote items', async () => {
    const item = sftpState.items[0]

    await deleteRemoteItem(item)

    expect(sftpState.items.some((candidate) => candidate.id === item.id)).toBe(false)
  })

  it('creates completed transfer tasks', async () => {
    const taskId = await createTransferTask('download', '/srv/app/app.log')

    expect(taskItems[0]).toMatchObject({id: taskId, progress: 100, status: 'done'})
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'success', title: 'Download queued'})
  })

  it('marks transfer tasks failed when IPC fails', async () => {
    setIpcMock(async (command) => {
      if (command === 'sftp_download') throw new Error('download failed')
      return undefined
    })

    await expect(createTransferTask('download', '/srv/app/app.log')).rejects.toThrow('sftp_download failed: download failed')

    expect(taskItems[0]).toMatchObject({status: 'failed'})
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: 'Download failed'})
  })
})
