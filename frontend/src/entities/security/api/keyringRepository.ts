import {credentialApi} from '../../../shared/ipc/ipcFacade'
import type {CredentialRef} from '../model/security.types'

export function storeCredential(credentialRef: CredentialRef, value: string) {
  return credentialApi.save(credentialRef.service, credentialRef.key, value)
}

export function getCredential(credentialRef: CredentialRef) {
  return credentialApi.get(credentialRef.service, credentialRef.key)
}

export function deleteCredential(credentialRef: CredentialRef) {
  return credentialApi.delete(credentialRef.service, credentialRef.key)
}

export function sessionPasswordRef(sessionId: string): CredentialRef {
  return {service: 'vrshell', key: `session:${sessionId}:password`}
}
