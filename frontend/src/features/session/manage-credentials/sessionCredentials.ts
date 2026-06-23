import type {SessionAuth} from '../../../entities/session'
import {getCredential, sessionPasswordRef, storeCredential} from '../../../entities/security/api/keyringRepository'

export async function persistSessionAuth(sessionId: string, auth: SessionAuth): Promise<SessionAuth> {
  if (auth.type !== 'password') return auth
  const password = auth.password?.trim()
  if (!password) return auth
  const credentialRef = auth.credentialRef ?? sessionPasswordRef(sessionId)
  await storeCredential(credentialRef, password)
  return {...auth, password, credentialRef}
}

export async function resolveSessionAuth(auth: SessionAuth | undefined, sessionId?: string): Promise<SessionAuth | undefined> {
  if (auth?.type !== 'password') return auth
  if (auth.password) return auth
  const credentialRef = auth.credentialRef ?? (sessionId ? sessionPasswordRef(sessionId) : null)
  if (!credentialRef) return auth
  const password = await getCredential(credentialRef)
  return password ? {...auth, password, credentialRef} : auth
}
