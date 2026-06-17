import type {SessionHost} from '../components/SessionTreeGroup.vue'

export type TerminalConfig = {
  host: string
  port: number
  username: string
  password: string
  privateKeyPath: string
  passphrase: string
  autoConnect: boolean
  autoReconnect: boolean
  idleTimeoutSecs: number
  hashKnownHosts: boolean
}

export function buildTerminalConfig(host?: SessionHost): TerminalConfig | undefined {
  if (!host) {
    return undefined
  }

  return {
    host: host.address,
    port: host.port,
    username: host.user,
    password: host.authMethod === 'password' ? host.password : '',
    privateKeyPath: host.authMethod === 'key' ? host.privateKeyPath ?? '' : '',
    passphrase: host.authMethod === 'key' ? host.passphrase ?? '' : '',
    autoConnect: true,
    autoReconnect: host.autoReconnect ?? false,
    idleTimeoutSecs: host.idleTimeoutSecs ?? 0,
    hashKnownHosts: host.hashKnownHosts ?? false,
  }
}
