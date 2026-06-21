import {addSessions, sessionState} from '../../../entities/session'
import {importSshConfig} from '../../../entities/session/api/sessionRepository'
import {pushToast} from '../../../shared/feedback'

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
    pushToast({level: 'error', title: 'Failed to import SSH config', detail: getErrorMessage(error)})
    throw error
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
