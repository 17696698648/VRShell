import {terminalApi} from '../../../shared/ipc/ipcFacade'
import type {SessionHost} from '../../session'
import {toConnectSshArgs} from '../../session/api/sshConnection'

export async function connectTerminal(session: SessionHost) {
  return terminalApi.open(toConnectSshArgs(session))
}

export function disconnectTerminal(sessionId: string) {
  return terminalApi.close(sessionId)
}

export function pollTerminalOutput(sessionId: string) {
  return terminalApi.pollEvents(sessionId)
}

export function sendTerminalInput(sessionId: string, dataBase64: string) {
  return terminalApi.write(sessionId, dataBase64)
}

export function resizeTerminalPty(sessionId: string | null, cols: number, rows: number) {
  return terminalApi.resize(sessionId, cols, rows)
}
