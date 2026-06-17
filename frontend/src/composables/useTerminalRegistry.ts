import { nextTick, ref, type Ref } from 'vue'

export type TerminalComponentHandle = {
  scheduleFitAndResize: () => void
  disconnect: () => void
  reconnect: () => void
}

export function useTerminalRegistry(
  activeSessionName: () => string | undefined,
  activeTerminalId: () => string | undefined,
) {
  const terminalComponentRefs = ref<Record<string, TerminalComponentHandle>>({})

  function getTerminalRefKey(sessionName: string, terminalId: string) {
    return `${sessionName}:${terminalId}`
  }

  function setTerminalComponentRef(sessionName: string, terminalId: string, component: unknown) {
    const refKey = getTerminalRefKey(sessionName, terminalId)

    if (component) {
      terminalComponentRefs.value[refKey] = component as TerminalComponentHandle
    } else {
      delete terminalComponentRefs.value[refKey]
    }
  }

  function getSessionTerminalRefs(sessionName: string) {
    const prefix = `${sessionName}:`
    return Object.entries(terminalComponentRefs.value)
      .filter(([refKey]) => refKey.startsWith(prefix))
      .map(([, terminal]) => terminal)
  }

  function getTerminalRef(sessionName: string, terminalId: string) {
    return terminalComponentRefs.value[getTerminalRefKey(sessionName, terminalId)]
  }

  function scheduleActiveTerminalFit(terminalId = activeTerminalId()) {
    const sessionName = activeSessionName()
    if (!sessionName || !terminalId) {
      return
    }

    nextTick(() => {
      getTerminalRef(sessionName, terminalId)?.scheduleFitAndResize()
    })
  }

  function disconnectTerminalRef(sessionName: string, terminalId: string) {
    getTerminalRef(sessionName, terminalId)?.disconnect()
    delete terminalComponentRefs.value[getTerminalRefKey(sessionName, terminalId)]
  }

  function reconnectTerminalRef(sessionName: string, terminalId: string) {
    getTerminalRef(sessionName, terminalId)?.reconnect()
  }

  function removeSessionTerminalRefs(sessionName: string) {
    const prefix = `${sessionName}:`
    Object.keys(terminalComponentRefs.value).forEach((refKey) => {
      if (refKey.startsWith(prefix)) {
        delete terminalComponentRefs.value[refKey]
      }
    })
  }

  return {
    terminalComponentRefs: terminalComponentRefs as Ref<Record<string, TerminalComponentHandle>>,
    getTerminalRefKey,
    setTerminalComponentRef,
    getSessionTerminalRefs,
    getTerminalRef,
    scheduleActiveTerminalFit,
    disconnectTerminalRef,
    reconnectTerminalRef,
    removeSessionTerminalRefs,
  }
}
