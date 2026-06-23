export type SessionProtocol = 'ssh' | 'rdp' | 'database'

interface SessionCredentialRef {
  service: string
  key: string
}

export type SessionAuth =
  | {type: 'agent'}
  | {type: 'password'; password?: string | null; credentialRef?: SessionCredentialRef | null}
  | {type: 'key'; privateKeyPath?: string | null; passphrase?: string | null}

export interface SessionHost {
  id: string
  name: string
  host: string
  port: number
  username: string
  protocol: SessionProtocol
  groupId: string
  tags: string[]
  status: 'idle' | 'connecting' | 'connected' | 'failed'
  auth?: SessionAuth
  backendSessionId?: string
}

export interface SessionGroup {
  id: string
  name: string
  sessionIds: string[]
  parentId?: string | null
}
