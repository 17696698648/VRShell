import {setActiveSession} from '../../../entities/session'
import type {SessionHost} from '../../../entities/session'
import {terminalState, type TerminalTab} from '../../../entities/terminal'
import {activateWorkspaceTab, workspaceState} from '../../../entities/workspace'

export type QuickOpenItem =
  | {id: string; kind: 'terminal'; label: string; detail: string; status: string; tab: TerminalTab}
  | {id: string; kind: 'session'; label: string; detail: string; status: string; session: SessionHost}

export function openQuickOpen() {
  workspaceState.quickOpenOpen = true
}

export function closeQuickOpen() {
  workspaceState.quickOpenOpen = false
}

export function getQuickOpenItems(sessions: SessionHost[], terminals: TerminalTab[]): QuickOpenItem[] {
  return [
    ...terminals.map((tab) => ({id: `terminal:${tab.id}`, kind: 'terminal' as const, label: tab.title, detail: `${tab.cwd} - ${tab.sessionId}`, status: tab.status, tab})),
    ...sessions.map((session) => ({id: `session:${session.id}`, kind: 'session' as const, label: session.name, detail: `${session.username}@${session.host} - ${session.tags.join(', ') || 'untagged'}`, status: session.status, session})),
  ]
}

export function activateQuickOpenItem(item: QuickOpenItem) {
  if (item.kind === 'terminal') activateWorkspaceTab(item.tab.id)
  else setActiveSession(item.session.id)
  closeQuickOpen()
}
