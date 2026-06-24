import {computed} from 'vue'
import {getActiveSession} from '../../../entities/session'
import {sftpState, setSftpItems} from '../../../entities/sftp'
import {listRemoteDirectory} from '../../../entities/sftp/api/sftpRepository'

export function useSftpExplorer() {
  const activeSession = computed(() => getActiveSession())

  async function refresh(path = sftpState.path) {
    const session = activeSession.value
    if (!session) return
    sftpState.loading = true
    sftpState.error = ''
    try {
      setSftpItems(path, await listRemoteDirectory(session, path))
    } catch (error) {
      sftpState.error = getErrorMessage(error)
    } finally {
      sftpState.loading = false
    }
  }

  function openParentDirectory() {
    if (sftpState.path === '/') return refresh('/')
    const parentPath = sftpState.path.split('/').filter(Boolean).slice(0, -1).join('/')
    return refresh(parentPath ? `/${parentPath}` : '/')
  }

  return {sftpState, activeSession, refresh, openParentDirectory}
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
