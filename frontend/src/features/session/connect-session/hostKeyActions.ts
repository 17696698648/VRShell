import {acceptHostKeyRequest, hostKeyState, rejectHostKeyRequest, setHostKeyRequestError, setHostKeyRequestSubmitting} from '../../../entities/security/model/hostKeyState'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {securityApi} from '../../../shared/ipc/ipcFacade'

export async function acceptPendingHostKey() {
  const request = hostKeyState.pendingRequest
  if (!request || request.submitting) return

  try {
    setHostKeyRequestError(null)
    if (request.reason === 'changed') {
      setHostKeyRequestError('Host key has changed. Verify the fingerprint before trusting this host again.')
      return
    }
    setHostKeyRequestSubmitting(true)
    await securityApi.acceptHostKey({
      pendingId: request.pendingId,
      ...request.authArgs,
    })
    acceptHostKeyRequest()
  } catch (error) {
    setHostKeyRequestSubmitting(false)
    setHostKeyRequestError(toHostKeyActionError(error))
    throw error
  }
}

export async function rejectPendingHostKey() {
  const request = hostKeyState.pendingRequest
  if (!request || request.submitting) return

  try {
    setHostKeyRequestSubmitting(true)
    if (request.pendingId) await securityApi.rejectHostKey(request.pendingId)
  } finally {
    rejectHostKeyRequest()
  }
}

function toHostKeyActionError(error: unknown) {
  const message = getErrorMessage(error).trim()
  return message || 'Failed to accept host key. Please try again.'
}
