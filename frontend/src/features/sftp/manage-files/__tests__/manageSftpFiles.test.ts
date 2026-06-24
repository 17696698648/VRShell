import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionEditorState} from '../../../../entities/editor'
import {sessionState, type SessionHost} from '../../../../entities/session'
import {sftpState, type SftpItem} from '../../../../entities/sftp'
import {taskItems} from '../../../../entities/task'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {encodeTextBase64} from '../../../../shared/lib/base64'
import {createRemoteDirectory, createTransferTask, deleteRemoteItem, openRemoteFileInSessionEditor, renameRemoteItem} from '../manageSftpFiles'

const activeSession: SessionHost = {id: 'sftp-session', name: 'SFTP Session', host: 'example.com', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'connected'}
const item: SftpItem = {id: '/srv/app/app.log', name: 'app.log', path: '/srv/app/app.log', type: 'file', size: '2 KB', modifiedAt: 'Now'}
const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultActiveSessionId = sessionState.activeSessionId
const defaultItems = JSON.parse(JSON.stringify(sftpState.items)) as typeof sftpState.items
const defaultPath = sftpState.path
const defaultTasks = JSON.parse(JSON.stringify(taskItems)) as typeof taskItems
const defaultSessionEditorFiles = JSON.parse(JSON.stringify(sessionEditorState.files)) as typeof sessionEditorState.files
const defaultSessionEditorActiveFiles = JSON.parse(JSON.stringify(sessionEditorState.activeFileIdBySession)) as typeof sessionEditorState.activeFileIdBySession
const defaultSessionEditorSplitRatios = JSON.parse(JSON.stringify(sessionEditorState.splitRatioBySession)) as typeof sessionEditorState.splitRatioBySession

describe('manageSftpFiles', () => {
  beforeEach(() => {
    sessionState.sessions.splice(0, sessionState.sessions.length, JSON.parse(JSON.stringify(activeSession)))
    sessionState.activeSessionId = activeSession.id
    sftpState.path = '/srv/app'
    sftpState.items.splice(0, sftpState.items.length, JSON.parse(JSON.stringify(item)))
    taskItems.splice(0, taskItems.length)
    resetRecord(sessionEditorState.activeFileIdBySession, {})
    sessionEditorState.files.splice(0, sessionEditorState.files.length)
    resetRecord(sessionEditorState.splitRatioBySession, {})
  })

  afterEach(() => {
    setIpcMock(null)
    clearToasts()
    sessionState.sessions.splice(0, sessionState.sessions.length, ...JSON.parse(JSON.stringify(defaultSessions)))
    sessionState.activeSessionId = defaultActiveSessionId
    sftpState.path = defaultPath
    sftpState.items.splice(0, sftpState.items.length, ...JSON.parse(JSON.stringify(defaultItems)))
    taskItems.splice(0, taskItems.length, ...JSON.parse(JSON.stringify(defaultTasks)))
    sessionEditorState.files.splice(0, sessionEditorState.files.length, ...JSON.parse(JSON.stringify(defaultSessionEditorFiles)))
    resetRecord(sessionEditorState.activeFileIdBySession, JSON.parse(JSON.stringify(defaultSessionEditorActiveFiles)))
    resetRecord(sessionEditorState.splitRatioBySession, JSON.parse(JSON.stringify(defaultSessionEditorSplitRatios)))
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

  it('opens remote files in the active session editor', async () => {
    setIpcMock(async (command) => {
      if (command === 'sftp_read_file') return encodeTextBase64('hello from remote')
      return undefined
    })

    await openRemoteFileInSessionEditor(item)

    expect(sessionEditorState.files[0]).toMatchObject({id: `sftp:${activeSession.id}:${item.path}`, sessionId: activeSession.id, title: item.name, path: item.path, content: 'hello from remote'})
    expect(sessionEditorState.activeFileIdBySession[activeSession.id]).toBe(sessionEditorState.files[0].id)
    expect(taskItems).toHaveLength(0)
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

function resetRecord<T>(target: Record<string, T>, value: Record<string, T>) {
  for (const key of Object.keys(target)) delete target[key]
  Object.assign(target, value)
}
