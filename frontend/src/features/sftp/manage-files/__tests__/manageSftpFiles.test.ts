import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {open} from '@tauri-apps/plugin-dialog'
import {openSessionEditorFile, sessionEditorState} from '../../../../entities/editor'
import {sessionState, type SessionHost} from '../../../../entities/session'
import {sftpState, type SftpItem} from '../../../../entities/sftp'
import {taskItems} from '../../../../entities/task'
import {workspaceState} from '../../../../entities/workspace'
import {clearToasts, feedbackState} from '../../../../shared/feedback'
import {setIpcMock} from '../../../../shared/ipc/ipcClient'
import {encodeTextBase64} from '../../../../shared/lib/base64'
import {createRemoteDirectory, createTransferTask, deleteRemoteItem, openRemoteFileInSessionEditor, renameRemoteItem, saveRemoteEditorFile, uploadFileToRemoteDirectory} from '../manageSftpFiles'

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(async () => '/tmp/app.log'),
}))

const activeSession: SessionHost = {id: 'sftp-session', name: 'SFTP Session', host: 'example.com', port: 22, username: 'deploy', protocol: 'ssh', groupId: 'all', tags: [], status: 'connected', backendSessionId: 'backend-sftp-session'}
const item: SftpItem = {id: '/srv/app/app.log', name: 'app.log', path: '/srv/app/app.log', type: 'file', size: '2 KB', modifiedAt: 'Now'}
const defaultSessions = JSON.parse(JSON.stringify(sessionState.sessions)) as typeof sessionState.sessions
const defaultActiveSessionId = sessionState.activeSessionId
const defaultItems = JSON.parse(JSON.stringify(sftpState.items)) as typeof sftpState.items
const defaultPath = sftpState.path
const defaultTasks = JSON.parse(JSON.stringify(taskItems)) as typeof taskItems
const defaultSessionEditorFiles = JSON.parse(JSON.stringify(sessionEditorState.files)) as typeof sessionEditorState.files
const defaultSessionEditorActiveFiles = JSON.parse(JSON.stringify(sessionEditorState.activeFileIdBySession)) as typeof sessionEditorState.activeFileIdBySession
const defaultSessionEditorSplitRatios = JSON.parse(JSON.stringify(sessionEditorState.splitRatioBySession)) as typeof sessionEditorState.splitRatioBySession
const defaultActiveBottomDockPanel = workspaceState.activeBottomDockPanel
const defaultBottomPanelVisible = workspaceState.bottomPanelVisible
const defaultRecentBottomDockPanel = workspaceState.recentBottomDockPanel
const defaultActiveMainView = workspaceState.activeMainView

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
    workspaceState.activeBottomDockPanel = 'none'
    workspaceState.bottomPanelVisible = false
    workspaceState.recentBottomDockPanel = 'logs'
    workspaceState.activeMainView = 'terminal'
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
    workspaceState.activeBottomDockPanel = defaultActiveBottomDockPanel
    workspaceState.bottomPanelVisible = defaultBottomPanelVisible
    workspaceState.recentBottomDockPanel = defaultRecentBottomDockPanel
    workspaceState.activeMainView = defaultActiveMainView
  })

  it('creates remote directories in current path', async () => {
    const item = await createRemoteDirectory('cache')

    expect(item).toMatchObject({name: 'cache', path: `${sftpState.path}/cache`, type: 'directory'})
    expect(sftpState.items[0]).toMatchObject(item!)
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'success', title: 'Created folder cache'})
  })

  it('renames remote items', async () => {
    const item = sftpState.items[0]

    await renameRemoteItem(item, 'renamed')

    expect(item.name).toBe('renamed')
    expect(item.path).toContain('/renamed')
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'success', title: 'Renamed to renamed'})
  })

  it('deletes remote items', async () => {
    const item = sftpState.items[0]

    await deleteRemoteItem(item)

    expect(sftpState.items.some((candidate) => candidate.id === item.id)).toBe(false)
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'success', title: 'Deleted app.log'})
  })

  it('blocks SFTP actions when the session is disconnected', async () => {
    sessionState.sessions[0].status = 'failed'
    sessionState.sessions[0].backendSessionId = undefined

    await expect(deleteRemoteItem(sftpState.items[0])).rejects.toThrow('Session is disconnected')

    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'warning', title: 'SFTP session disconnected'})
  })

  it('reports file operation failures with actionable toasts', async () => {
    setIpcMock(async (command) => {
      if (command === 'sftp_mkdir') throw new Error('permission denied')
      return undefined
    })

    await expect(createRemoteDirectory('cache')).rejects.toThrow('sftp_mkdir failed: permission denied')

    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'error', title: 'Create folder cache failed'})
  })

  it('opens remote files in the active session editor', async () => {
    setIpcMock(async (command) => {
      if (command === 'sftp_read_file') return encodeTextBase64('hello from remote')
      return undefined
    })

    await openRemoteFileInSessionEditor(item)

    expect(sessionEditorState.files[0]).toMatchObject({id: `sftp:${activeSession.id}:${item.path}`, sessionId: activeSession.id, title: item.name, path: item.path, content: 'hello from remote'})
    expect(sessionEditorState.activeFileIdBySession[activeSession.id]).toBe(sessionEditorState.files[0].id)
    expect(workspaceState.activeMainView).toBe('editor')
    expect(taskItems).toHaveLength(0)
  })

  it('saves dirty editor files back to the remote path', async () => {
    let uploadArgs: unknown = null
    setIpcMock(async (command, args) => {
      if (command === 'sftp_upload') uploadArgs = args
      return undefined
    })
    openSessionEditorFile({
      id: `sftp:${activeSession.id}:${item.path}`,
      sessionId: activeSession.id,
      path: item.path,
      title: item.name,
      content: 'edited content',
      dirty: true,
    })

    await saveRemoteEditorFile(sessionEditorState.files[0])

    expect(taskItems[0]).toMatchObject({progress: 100, status: 'done'})
    expect(sessionEditorState.files[0]).toMatchObject({dirty: false, saving: false, error: undefined})
    expect(uploadArgs).toMatchObject({options: {conflict: 'overwrite'}})
  })

  it('creates completed transfer tasks', async () => {
    const taskId = await createTransferTask('download', '/srv/app/app.log')

    expect(taskItems[0]).toMatchObject({id: taskId, progress: 100, status: 'done'})
    expect(workspaceState.activeBottomDockPanel).toBe('tasks')
    expect(workspaceState.bottomPanelVisible).toBe(true)
    expect(feedbackState.toasts.at(-1)).toMatchObject({level: 'success', title: 'Download completed'})
  })

  it('passes upload conflict strategy to IPC', async () => {
    vi.mocked(open).mockResolvedValueOnce('/tmp/app.env')
    let uploadArgs: unknown = null
    setIpcMock(async (command, args) => {
      if (command === 'sftp_upload') uploadArgs = args
      return undefined
    })

    await uploadFileToRemoteDirectory('/srv/app', {conflict: 'rename'})

    expect(uploadArgs).toMatchObject({
      remotePath: '/srv/app/app.env',
      localPath: '/tmp/app.env',
      options: {conflict: 'rename'},
    })
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
