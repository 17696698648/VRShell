import {typedInvoke} from '../../../shared/ipc/ipcClient'
import type {SessionHost} from '../../session'

export async function connectTerminal(session: SessionHost) {
  return typedInvoke('connect_ssh', {
    host: session.host,
    port: session.port,
    username: session.username,
    password: session.auth?.type === 'password' ? session.auth.password : null,
    privateKeyPath: session.auth?.type === 'key' ? session.auth.privateKeyPath : null,
    passphrase: session.auth?.type === 'key' ? session.auth.passphrase : null,
    autoReconnect: true,
    idleTimeoutSecs: 0,
  })
}

export function disconnectTerminal(sessionId: string) {
  return typedInvoke('disconnect_session', {sessionId})
}

export function pollTerminalOutput(sessionId: string) {
  return typedInvoke('poll_events', {sessionId})
}

export function sendTerminalInput(sessionId: string, dataBase64: string) {
  return typedInvoke('send_input', {sessionId, dataBase64})
}

export function resizeTerminalPty(sessionId: string | null, cols: number, rows: number) {
  return typedInvoke('resize_pty', {sessionId, cols, rows})
}
