import {invoke} from '@tauri-apps/api/core'
import type {ContextMenuScope} from '../menuTypes'
import {applySftpContextAction} from './sftpContextActions'

type SessionTreeContextScope = Extract<ContextMenuScope, 'group' | 'session'>

export type ContextMenuActionHandlers = {
  applyEditorTabAction: (targetId: string, action: string) => Promise<void>
  applySessionTabAction: (targetId: string, action: string) => Promise<void>
  applyTerminalTabAction: (targetId: string, action: string) => void
  applySftpAction: Parameters<typeof applySftpContextAction>[0]['applySftpAction']
  openInTerminal: Parameters<typeof applySftpContextAction>[0]['openInTerminal']
  applySessionTreeAction: (targetType: SessionTreeContextScope, targetId: string, action: string) => void
}

export async function applyContextMenuAction(options: {
  targetType: ContextMenuScope
  targetId: string
  action: string
  handlers: ContextMenuActionHandlers
}) {
  const {targetType, targetId, action, handlers} = options

  if (targetType === 'editor-tab') {
    await handlers.applyEditorTabAction(targetId, action)
    return
  }

  if (targetType === 'session-tab') {
    await handlers.applySessionTabAction(targetId, action)
    return
  }

  if (targetType === 'terminal-tab') {
    handlers.applyTerminalTabAction(targetId, action)
    return
  }

  if (targetType === 'sftp-directory' || targetType === 'sftp-file') {
    await applySftpContextAction({
      targetType,
      targetId,
      action,
      openInTerminal: handlers.openInTerminal,
      applySftpAction: handlers.applySftpAction,
    })
    return
  }

  handlers.applySessionTreeAction(targetType, targetId, action)
  const result = await invoke('session_tree_action', {
    targetType,
    targetId,
    action,
  })
  console.info('session tree action:', result)
}
