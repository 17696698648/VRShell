import type { TerminalStatus, TerminalTab } from '../../types'

export function createTerminalTabState(id: string, name: string, selected = false): TerminalTab {
  return { id, name, selected, sessionId: '', status: 'idle', error: '' }
}

export function addTerminalTab(
  terminals: TerminalTab[],
  createId: () => string,
  name = `Terminal ${terminals.length + 1}`,
) {
  terminals.forEach((terminal) => {
    terminal.selected = false
  })

  const terminal = createTerminalTabState(createId(), name, true)
  terminals.push(terminal)
  return terminal
}

export function selectTerminalTab(terminals: TerminalTab[], terminalId: string) {
  terminals.forEach((terminal) => {
    terminal.selected = terminal.id === terminalId
  })
}

export function renameTerminalTab(terminals: TerminalTab[], terminalId: string, name: string) {
  const terminal = terminals.find((item) => item.id === terminalId)

  if (terminal && name) {
    terminal.name = name
  }
}

export function closeTerminalTab(terminals: TerminalTab[], terminalId: string, createId: () => string) {
  const closedIndex = terminals.findIndex((terminal) => terminal.id === terminalId)

  if (closedIndex < 0) {
    return false
  }

  const wasSelected = terminals[closedIndex].selected
  terminals.splice(closedIndex, 1)

  if (terminals.length === 0) {
    terminals.push(createTerminalTabState(createId(), 'Terminal 1', true))
    return true
  }

  if (wasSelected) {
    const nextIndex = Math.min(closedIndex, terminals.length - 1)
    terminals.forEach((terminal, index) => {
      terminal.selected = index === nextIndex
    })
  }

  return true
}

export function updateTerminalSessionId(terminals: TerminalTab[], terminalId: string, sessionId: string) {
  const terminal = terminals.find((item) => item.id === terminalId)

  if (terminal) {
    terminal.sessionId = sessionId
  }
}

export function updateTerminalStatus(
  terminals: TerminalTab[],
  terminalId: string,
  status: TerminalStatus,
  error = '',
) {
  const terminal = terminals.find((item) => item.id === terminalId)

  if (!terminal) {
    return false
  }

  terminal.status = status
  terminal.error = error

  if (status === 'disconnected' || status === 'error') {
    terminal.sessionId = ''
  }

  return true
}

export function applyTerminalTabAction(options: {
  terminals: TerminalTab[]
  terminalId: string
  action: string
  createId: () => string
  reconnectTerminal: (terminalId: string) => void
  copySshCommand: () => void
  closeTerminalTab: (terminalId: string) => void
  selectTerminalTab: (terminalId: string) => void
}) {
  const terminal = options.terminals.find((item) => item.id === options.terminalId)

  if (options.action === 'reconnect_terminal') {
    options.reconnectTerminal(options.terminalId)
    return
  }

  if (options.action === 'duplicate_terminal') {
    const index = options.terminals.length + 1
    addTerminalTab(
      options.terminals,
      options.createId,
      `${terminal?.name ?? 'Terminal'} Copy ${index}`,
    )
    return
  }

  if (options.action === 'copy_ssh_command') {
    options.copySshCommand()
    return
  }

  if (options.action === 'close_other_terminals') {
    options.terminals
      .filter((terminalTab) => terminalTab.id !== options.terminalId)
      .map((terminalTab) => terminalTab.id)
      .forEach((id) => options.closeTerminalTab(id))
    options.selectTerminalTab(options.terminalId)
    return
  }

  if (options.action === 'close_all_terminals') {
    options.terminals.map((terminalTab) => terminalTab.id).forEach((id) => options.closeTerminalTab(id))
  }
}

export function getTerminalStatusLabel(status: TerminalStatus) {
  const labels: Record<TerminalStatus, string> = {
    idle: 'Idle',
    connecting: 'Connecting',
    connected: 'Connected',
    reconnecting: 'Reconnecting',
    disconnected: 'Disconnected',
    error: 'Error',
  }

  return labels[status]
}

export function getTerminalTabTitle(terminal: TerminalTab) {
  const statusText = terminal.error
    ? `${getTerminalStatusLabel(terminal.status)}: ${terminal.error}`
    : getTerminalStatusLabel(terminal.status)

  return `${terminal.name} - ${statusText}`
}
