import {terminalApi} from '../../../shared/ipc/ipcFacade'
import type {SessionHost} from '../../session'

export async function connectTerminal(session: SessionHost) {
  return terminalApi.open({
    host: session.host,
    port: session.port,
    username: session.username,
    password: session.auth?.type === 'password' ? session.auth.password : null,
    privateKeyPath: session.auth?.type === 'key' ? session.auth.privateKeyPath : null,
    passphrase: session.auth?.type === 'key' ? session.auth.passphrase : null,
    authMethod: session.auth?.type ?? 'agent',
    autoReconnect: true,
    idleTimeoutSecs: 0,
  })
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
