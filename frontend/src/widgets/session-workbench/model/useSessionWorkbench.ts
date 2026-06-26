import {computed} from 'vue'
import {getActiveSession, sessionState, setActiveSession} from '../../../entities/session'
import {clearSessionEditorState} from '../../../entities/editor'
import {removeSftpSessionState} from '../../../entities/sftp'
import {connectTerminal} from '../../../entities/terminal/api/terminalRepository'
import {openTerminal, patchTerminal, terminalState} from '../../../entities/terminal'
import {getErrorMessage} from '../../../shared/error/getErrorMessage'
import {messages} from '../../../shared/copy'
import {notifyTerminalFailure} from '../../../shared/feedback'
import {resolveSessionAuth} from '../../../features/session/manage-credentials/sessionCredentials'
import {closeTerminalTab} from '../../../features/terminal/close-terminal/closeTerminalTab'

export function useSessionWorkbench() {
  const activeSession = computed(() => getActiveSession() ?? sessionState.sessions.find((session) => session.id === terminalState.tabs.find((tab) => tab.id === terminalState.activeTerminalId)?.sessionId) ?? null)
  const currentSessionTerminals = computed(() => {
    const session = activeSession.value
    if (!session) return []
    return terminalState.tabs.filter((tab) => tab.sessionId === session.id)
  })
  const activeTerminal = computed(() => currentSessionTerminals.value.find((tab) => tab.id === terminalState.activeTerminalId) ?? currentSessionTerminals.value[0] ?? null)
  const openSessions = computed(() => {
    const seen = new Set<string>()
    const orderedSessionIds: string[] = []
    for (const tab of terminalState.tabs) {
      if (!seen.has(tab.sessionId)) {
        seen.add(tab.sessionId)
        orderedSessionIds.push(tab.sessionId)
      }
    }
    const sessionMap = new Map(sessionState.sessions.map((s) => [s.id, s]))
    return orderedSessionIds.map((id) => sessionMap.get(id)).filter((s): s is NonNullable<typeof s> => s != null)
  })

  function activateSession(sessionId: string) {
    setActiveSession(sessionId)
    const firstTerminal = terminalState.tabs.find((tab) => tab.sessionId === sessionId)
    if (firstTerminal) terminalState.activeTerminalId = firstTerminal.id
  }

  async function closeSessionTab(sessionId: string) {
    const terminals = terminalState.tabs.filter((tab) => tab.sessionId === sessionId)
    for (const terminal of terminals) await closeTerminalTab(terminal, {skipConfirm: true})
    clearSessionEditorState(sessionId)
    removeSftpSessionState(sessionId)
    if (activeSession.value?.id === sessionId) {
      const nextTerminal = terminalState.tabs.find((tab) => tab.sessionId !== sessionId)
      if (nextTerminal) activateSession(nextTerminal.sessionId)
    }
  }

  async function openAdditionalTerminal() {
    const session = activeSession.value
    if (!session) return
    const terminalIndex = terminalState.tabs.filter((tab) => tab.sessionId === session.id).length + 1
    const terminalId = `term-${session.id}-${Date.now()}`
    openTerminal({
      id: terminalId,
      sessionId: session.id,
      backendSessionId: '',
      title: session.name,
      status: 'connecting',
      cwd: '~',
      lines: [`Connecting to ${session.username}@${session.host}:${session.port}...`],
    })
    try {
      const auth = await resolveSessionAuth(session.auth, session.id)
      const resolvedSession = {...session, auth}
      const backendSessionId = await connectTerminal(resolvedSession)
      patchTerminal(terminalId, {
        backendSessionId,
        status: 'connected',
      })
    } catch (error) {
      patchTerminal(terminalId, {status: 'failed'})
      notifyTerminalFailure({action: 'open-failed', terminalId, title: messages.terminal.failures.open, detail: getErrorMessage(error)})
    }
  }

  return {terminalState, activeTerminal, activeSession, currentSessionTerminals, openSessions, activateSession, closeSessionTab, openAdditionalTerminal}
}
