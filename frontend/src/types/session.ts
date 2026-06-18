import type {SessionGroup} from '../components/SessionTreeGroup.vue'

export type SessionFormModel = {
  name: string
  groupId: string
  address: string
  port: number
  authMethod: string
  user: string
  password: string
  passwordKeyringId?: string
  privateKeyPath: string
  passphrase: string
  remark: string
  autoReconnect: boolean
  idleTimeoutSecs: number
  hashKnownHosts: boolean
  identityFile: string
}

export type SessionFormErrors = Partial<Record<keyof Pick<SessionFormModel, 'name' | 'address' | 'port' | 'user'>, string>>

export type GroupTreeOption = {
  group: SessionGroup
  depth: number
}
