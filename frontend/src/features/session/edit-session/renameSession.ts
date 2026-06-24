import type {SessionHost} from '../../../entities/session'
import {requestPrompt} from '../../../shared/dialog'
import {notifyError, notifyWarning} from '../../../shared/feedback'
import {editSession} from './editSession'
import {messages} from '../../../shared/copy'

export async function renameSession(session: SessionHost) {
  const name = await requestPrompt({title: 'Rename session', label: 'Session name', value: session.name, confirmLabel: 'Rename'})
  if (name === null) return
  try {
    editSession(session.id, {name})
  } catch (error) {
    notifyError({title: messages.session.failures.rename(session.name), detail: getErrorMessage(error)})
    throw error
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}



