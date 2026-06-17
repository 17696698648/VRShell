import type {ContextMenuScope, SftpAction} from '../menuTypes'
import {parentRemotePath} from './sftp'

export function isSftpContextScope(scope: ContextMenuScope): scope is 'sftp-directory' | 'sftp-file' {
  return scope === 'sftp-directory' || scope === 'sftp-file'
}

export async function applySftpContextAction(options: {
  targetType: 'sftp-directory' | 'sftp-file'
  targetId: string
  action: string
  openInTerminal: (path: string) => Promise<void>
  applySftpAction: (targetType: 'sftp-directory' | 'sftp-file', targetId: string, action: SftpAction) => Promise<void>
}) {
  if (options.action === 'open_in_terminal') {
    const cdPath = options.targetType === 'sftp-directory'
      ? options.targetId
      : parentRemotePath(options.targetId)
    await options.openInTerminal(cdPath)
    return
  }

  await options.applySftpAction(options.targetType, options.targetId, options.action as SftpAction)
}
