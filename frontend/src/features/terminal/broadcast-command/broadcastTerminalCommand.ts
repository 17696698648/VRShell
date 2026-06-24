import {appendTerminalLines, terminalState} from '../../../entities/terminal'
import {notifyFeedback, notifyWarning} from '../../../shared/feedback'
import {sendInputToTerminalTab} from '../send-terminal-input/sendTerminalInput'

export async function broadcastTerminalCommand(command: string) {
  const input = command.trim()
  if (!input) return
  const connectedTabs = terminalState.tabs.filter((tab) => tab.status === 'connected')
  if (connectedTabs.length === 0) {
    notifyWarning({title: 'No connected terminals', detail: 'Reconnect a terminal before broadcasting commands.', dedupeKey: 'terminal:broadcast:no-connected'})
    return
  }

  await Promise.all(connectedTabs.map(async (tab) => {
    appendTerminalLines(tab.id, [`${tab.cwd}$ ${input}`])
    await sendInputToTerminalTab(tab, input)
  }))

  notifyFeedback({level: 'success', title: `Broadcast to ${connectedTabs.length} terminals`, detail: input})
}
