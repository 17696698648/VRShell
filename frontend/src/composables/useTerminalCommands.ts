import type { SessionHost } from '../components/SessionTreeGroup.vue'
import type { TerminalTab, ToastMessage } from '../types'
import type { TerminalComponentHandle } from './useTerminalRegistry'
import { sendTerminalInput } from '../services/terminal'

export function useTerminalCommands({
  getActiveSession,
  getActiveTerminal,
  getTerminalRef,
  showToast,
}: {
  getActiveSession: () => SessionHost | null | undefined
  getActiveTerminal: () => TerminalTab | null | undefined
  getTerminalRef: (sessionName: string, terminalId: string) => TerminalComponentHandle | undefined
  showToast: (message: string, type?: ToastMessage['type']) => void
}) {
  async function openInTerminal(path: string) {
    const session = getActiveSession()
    const terminal = getActiveTerminal()

    if (!session || !terminal) {
      showToast('No active terminal', 'error')
      return
    }

    const terminalRef = getTerminalRef(session.name, terminal.id)
    if (!terminalRef) {
      showToast('Terminal not ready', 'error')
      return
    }

    const command = `cd ${quoteShellPath(path)}\n`
    const encoded = new TextEncoder().encode(command)

    try {
      await sendTerminalInput(terminal.sessionId || '', btoa(String.fromCharCode(...encoded)))
      showToast(`cd ${path}`, 'info')
    } catch {
      showToast('Failed to send command', 'error')
    }
  }

  function copySshCommand() {
    const host = getActiveSession()
    if (!host) {
      return
    }

    const command = `ssh -p ${host.port} ${host.user}@${host.address}`
    navigator.clipboard?.writeText(command)
    showToast('SSH command copied', 'success')
  }

  return {
    copyText,
    copySshCommand,
    openInTerminal,
    quoteShellPath,
  }
}

export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

export function quoteShellPath(path: string) {
  return `'${path.replace(/'/g, "'\\''")}'`
}
