import {ref} from 'vue'
import type {TerminalStatus} from '../../types'

export function useTerminalConnectionState(emitStatus: (status: TerminalStatus, error?: string) => void) {
  const sessionId = ref<string | null>(null)
  const connected = ref(false)
  const hasAttemptedConnection = ref(false)
  const status = ref('idle')

  function setStatus(nextStatus: TerminalStatus, error = '') {
    status.value = error || nextStatus
    emitStatus(nextStatus, error)
  }

  function markConnecting() {
    hasAttemptedConnection.value = true
    connected.value = false
    setStatus('connecting')
  }

  function markConnected(nextSessionId: string) {
    sessionId.value = nextSessionId
    connected.value = true
    setStatus('connected')
  }

  function markReconnecting() {
    connected.value = false
    setStatus('reconnecting')
  }

  function markDisconnected(message = '') {
    sessionId.value = null
    connected.value = false
    setStatus('disconnected', message)
  }

  function markError(message: string) {
    connected.value = false
    setStatus('error', message)
  }

  function setInfo(message: string) {
    status.value = message
  }

  return {
    sessionId,
    connected,
    hasAttemptedConnection,
    status,
    setStatus,
    setInfo,
    markConnecting,
    markConnected,
    markReconnecting,
    markDisconnected,
    markError,
  }
}
