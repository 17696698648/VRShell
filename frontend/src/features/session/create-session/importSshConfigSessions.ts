import {addSessions, sessionState} from '../../../entities/session'
import {importSshConfig} from '../../../entities/session/api/sessionRepository'
import {notifyAppError} from '../../../shared/feedback'
import {messages} from '../../../shared/copy'

export interface ImportSshConfigSummary {
  imported: number
  skipped: number
  total: number
}

export async function importSshConfigSessions(): Promise<ImportSshConfigSummary> {
  try {
    const result = await importSshConfig(sessionState.sessions)
    addSessions(result.imported)
    return {imported: result.imported.length, skipped: result.skipped, total: result.total}
  } catch (error) {
    notifyAppError(error, {title: messages.session.failures.importSshConfig, action: 'import-ssh-config'})
    throw error
  }
}
