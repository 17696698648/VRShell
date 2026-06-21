use crate::{
    domain::credential::CredentialRef,
    error::{BackendError, BackendResult},
};

pub(crate) struct KeyringStore;

impl KeyringStore {
    pub(crate) fn store(credential_ref: &CredentialRef, secret: &str) -> BackendResult<()> {
        entry(credential_ref)
            .set_password(secret)
            .map_err(|error| credential_error("store credential", error))
    }

    pub(crate) fn get(credential_ref: &CredentialRef) -> BackendResult<Option<String>> {
        match entry(credential_ref).get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(credential_error("read credential", error)),
        }
    }

    pub(crate) fn delete(credential_ref: &CredentialRef) -> BackendResult<()> {
        match entry(credential_ref).delete_password() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(credential_error("delete credential", error)),
        }
    }
}

fn entry(credential_ref: &CredentialRef) -> keyring::Entry {
    keyring::Entry::new(&credential_ref.service, &credential_ref.key)
}

fn credential_error(action: &str, error: keyring::Error) -> BackendError {
    BackendError::credential(format!("failed to {action}: {error}"))
}
