export type NormalizedTerminalMessage = {
  sessionId: string
  message: string
  code?: string
  hostKeyFingerprint?: string
}

export function normalizeTerminalMessage(payload: unknown): NormalizedTerminalMessage {
  if (payload && typeof payload === 'object') {
    const value = payload as {
      session_id?: string
      sessionId?: string
      message?: string
      code?: string
      hostKeyFingerprint?: string
    }
    return {
      sessionId: value.session_id ?? value.sessionId ?? '',
      message: value.message ?? String(payload),
      code: value.code,
      hostKeyFingerprint: value.hostKeyFingerprint,
    }
  }

  return {sessionId: '', message: String(payload)}
}

export function isCurrentTerminalMessage(payload: unknown, currentSessionId: string | null) {
  const message = normalizeTerminalMessage(payload)
  return !message.sessionId || message.sessionId === currentSessionId
}
