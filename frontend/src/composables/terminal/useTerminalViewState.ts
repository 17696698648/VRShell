import {computed, type Ref} from 'vue'
import type {SessionHost} from '../../components/SessionTreeGroup.vue'
import type {TerminalTab} from '../../types'
import {getTerminalStatusLabel} from './useTerminalTabs'

export function useTerminalViewState(options: {
  terminalTabs: Ref<TerminalTab[]>
  broadcastEnabled: Ref<boolean>
  activeSession: Ref<SessionHost | undefined>
}) {
  const activeTerminalTab = computed(() => (
    options.terminalTabs.value.find((terminal) => terminal.selected) ?? null
  ))

  const broadcastTargetSessionIds = computed(() => {
    if (!options.broadcastEnabled.value || !options.activeSession.value) {
      return [] as string[]
    }

    const active = activeTerminalTab.value
    return options.terminalTabs.value
      .filter((terminal) => terminal.id !== active?.id && terminal.sessionId)
      .map((terminal) => terminal.sessionId)
  })

  const terminalStatusText = computed(() => {
    const terminal = activeTerminalTab.value

    if (!terminal) {
      return ''
    }

    return terminal.error
      ? `${getTerminalStatusLabel(terminal.status)} - ${terminal.error}`
      : getTerminalStatusLabel(terminal.status)
  })

  return {
    activeTerminalTab,
    broadcastTargetSessionIds,
    terminalStatusText,
  }
}
