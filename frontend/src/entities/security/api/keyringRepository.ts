import {typedInvoke} from '../../../shared/ipc/ipcClient'
import type {CredentialRef} from '../model/security.types'

export function storeCredential(credentialRef: CredentialRef, value: string) {
  return typedInvoke('keyring_store', {...credentialRef, value})
}

export function getCredential(credentialRef: CredentialRef) {
  return typedInvoke('keyring_get', credentialRef)
}

export function deleteCredential(credentialRef: CredentialRef) {
  return typedInvoke('keyring_delete', credentialRef)
}

export function sessionPasswordRef(sessionId: string): CredentialRef {
  return {service: 'vrshell', key: `session:${sessionId}:password`}
}
