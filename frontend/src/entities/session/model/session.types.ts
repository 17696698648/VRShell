export type SessionProtocol = 'ssh' | 'rdp' | 'database'

export type SessionAuth =
  | {type: 'agent'}
  | {type: 'password'; password?: string | null}
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
}
