import {typedInvoke} from './ipc'

export interface TestSshConnectionOptions {
  host: string
  port: number
  username: string
  password?: string | null
  privateKeyPath?: string | null
  passphrase?: string | null
}

export interface HostKeyInfo {
  host: string
  port: number
  fingerprint: string
  keyType: string
  knownHostsPath: string
  hashKnownHosts: boolean
  firstTrustWarning: string
}

export interface SecuritySettingsInfo {
  hashKnownHosts: boolean
  knownHostsPath: string
  credentialStore: string
  autoReconnectDefault: boolean
  logRedactionEnabled: boolean
}

export type ConnectionDiagnosticStage = {
  stage: 'dns' | 'tcp' | 'ssh' | 'auth' | 'host_key'
  status: 'pending' | 'success' | 'error' | 'skipped'
  message: string
  latencyMs?: number
}

export type SshConfigHost = {
  host: string
  hostname: string
  user: string
  port: number
  identityFile?: string | null
}

export type SshConfigImportPreview = {
  hosts: SshConfigHost[]
  duplicateHosts: string[]
  missingIdentityFiles: string[]
}

export function measureTcpLatency(host: string, port: number) {
  return typedInvoke<number>('tcp_latency', {host, port})
}

export function testSshConnection(options: TestSshConnectionOptions) {
  return typedInvoke<number>('test_ssh_connection', options)
}

export function getPendingHostKeyInfo(host: string, port: number) {
  return typedInvoke('get_pending_host_key_info', {host, port})
}

export function removeKnownHost(host: string, port: number) {
  return typedInvoke('remove_known_host', {host, port})
}

export function getSecuritySettings() {
  return typedInvoke('get_security_settings')
}

export async function diagnoseSshConnection(options: TestSshConnectionOptions): Promise<ConnectionDiagnosticStage[]> {
  const stages: ConnectionDiagnosticStage[] = [
    {stage: 'dns', status: 'pending', message: 'Resolving host'},
    {stage: 'tcp', status: 'pending', message: 'Opening TCP connection'},
    {stage: 'ssh', status: 'pending', message: 'Starting SSH handshake'},
    {stage: 'host_key', status: 'pending', message: 'Checking host key'},
    {stage: 'auth', status: 'pending', message: 'Authenticating'},
  ]
  try {
    const latencyMs = await measureTcpLatency(options.host, options.port)
    stages[0] = {stage: 'dns', status: 'success', message: 'Host resolved'}
    stages[1] = {stage: 'tcp', status: 'success', message: 'TCP reachable', latencyMs}
  } catch (error) {
    stages[0] = {stage: 'dns', status: 'error', message: String(error || 'DNS/TCP check failed')}
    stages[1] = {stage: 'tcp', status: 'error', message: 'TCP connection failed'}
    return stages.map((stage) => stage.status === 'pending' ? {...stage, status: 'skipped'} : stage)
  }

  try {
    const latencyMs = await testSshConnection(options)
    return stages.map((stage) => ({
      ...stage,
      status: 'success',
      message: stage.stage === 'auth' ? 'Authentication successful' : stage.message.replace('Starting', 'Completed').replace('Checking', 'Verified'),
      latencyMs: stage.stage === 'auth' ? latencyMs : stage.latencyMs,
    }))
  } catch (error: any) {
    const code = typeof error?.code === 'string' ? error.code : 'unknown'
    const failedStage = code.startsWith('host_key') ? 'host_key' : code.startsWith('auth') ? 'auth' : code === 'handshake' ? 'ssh' : 'ssh'
    return stages.map((stage) => {
      if (stage.status === 'success') return stage
      if (stage.stage === failedStage) return {...stage, status: 'error', message: String(error?.message || 'Connection failed')}
      return {...stage, status: 'skipped'}
    })
  }
}

export async function previewSshConfigImport(existingNames: string[] = []): Promise<SshConfigImportPreview> {
  const hosts = await typedInvoke<SshConfigHost[]>('parse_ssh_config')
  const existing = new Set(existingNames.map((name) => name.toLowerCase()))
  return {
    hosts,
    duplicateHosts: hosts.filter((host) => existing.has(host.host.toLowerCase())).map((host) => host.host),
    missingIdentityFiles: hosts
      .filter((host) => host.identityFile && !host.identityFile.trim())
      .map((host) => host.host),
  }
}
