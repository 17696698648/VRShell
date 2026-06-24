import {addSessions, sessionState} from '../../../entities/session'
import {importSshConfig} from '../../../entities/session/api/sessionRepository'
import {notifyError, notifyWarning} from '../../../shared/feedback'
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
    notifyError({title: messages.session.failures.importSshConfig, detail: getErrorMessage(error)})
    throw error
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}



