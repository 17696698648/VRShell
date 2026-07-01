import type {ConnectSshArgs, SshConnection} from '../../../shared/ipc/ipcFacade'
import type {SessionHost} from '../model/session.types'

export function toSshConnection(session: SessionHost): SshConnection {
  return {
    host: session.host,
    port: session.port,
    username: session.username,
    password: session.auth?.type === 'password' ? session.auth.password : null,
    privateKeyPath: session.auth?.type === 'key' ? session.auth.privateKeyPath : null,
    passphrase: session.auth?.type === 'key' ? session.auth.passphrase : null,
    authMethod: session.auth?.type,
    credentialRef: session.auth?.type === 'password' ? session.auth.credentialRef : null,
  }
}

export function toConnectSshArgs(session: SessionHost): ConnectSshArgs {
  return {
    ...toSshConnection(session),
    authMethod: session.auth?.type ?? 'agent',
    autoReconnect: true,
    idleTimeoutSecs: 0,
  }
}

