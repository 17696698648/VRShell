import {
  sessionApi,
  type BackendSessionGroup,
  type BackendSessionHost,
  type SessionTreeActionPayload,
  type SessionTreeActionResult,
  type SshConfigHost,
} from '../../../shared/ipc/ipcFacade'
import {validateNewSession} from '../model/sessionValidation'
import type {SessionHost} from '../model/session.types'

export interface ImportSshConfigResult {
  imported: SessionHost[]
  skipped: number
  total: number
}

export async function applySessionTreeAction(payload: SessionTreeActionPayload): Promise<SessionTreeActionResult> {
  return sessionApi.applyTreeAction(payload)
}

export function createSessionHostAction(host: BackendSessionHost, destinationGroupId = 'all'): SessionTreeActionPayload {
  return {
    action: 'create',
    targetType: 'host',
    targetId: host.id || host.name,
    destinationGroupId,
    host,
  }
}

export function createSessionGroupAction(group: BackendSessionGroup, destinationGroupId?: string): SessionTreeActionPayload {
  return {
    action: 'create',
    targetType: 'group',
    targetId: group.id,
    destinationGroupId,
    group,
  }
}

export function deleteSessionHostAction(targetId: string): SessionTreeActionPayload {
  return {action: 'delete', targetType: 'host', targetId}
}

export function deleteSessionGroupAction(targetId: string): SessionTreeActionPayload {
  return {action: 'delete', targetType: 'group', targetId}
}

export async function importSshConfig(existingSessions: SessionHost[]): Promise<ImportSshConfigResult> {
  const hosts = await sessionApi.importSshConfig()
  const importedSessions: SessionHost[] = []
  let skipped = 0
  for (const host of hosts) {
    const session = toSessionHost(host)
    if (!validateNewSession(session, [...existingSessions, ...importedSessions]).valid) {
      skipped += 1
      continue
    }
    importedSessions.push(session)
  }
  return {imported: importedSessions, skipped, total: hosts.length}
}

function toSessionHost(host: SshConfigHost): SessionHost {
  return {
    id: `ssh-${sanitizeId(getHostName(host))}`,
    name: getHostName(host).trim(),
    host: (host.hostname || host.host).trim(),
    port: host.port || 22,
    username: (host.user || 'user').trim(),
    protocol: 'ssh',
    groupId: 'favorites',
    tags: ['imported'],
    status: 'idle',
    auth: host.identityFile ? {type: 'key', privateKeyPath: host.identityFile} : {type: 'agent'},
  }
}

function getHostName(host: SshConfigHost) {
  return host.alias || host.host || host.hostname
}

function sanitizeId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
