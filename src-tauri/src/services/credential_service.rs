use crate::{
    domain::credential::CredentialRef,
    error::{BackendError, BackendResult},
    infrastructure::keyring_store::KeyringStore,
};

pub(crate) fn store(credential_ref: CredentialRef, secret: String) -> BackendResult<()> {
    validate_ref(&credential_ref)?;
    if secret.is_empty() {
        return Err(BackendError::validation("credential secret is required"));
    }
    KeyringStore::store(&credential_ref, &secret)
}

pub(crate) fn get(credential_ref: CredentialRef) -> BackendResult<Option<String>> {
    validate_ref(&credential_ref)?;
    KeyringStore::get(&credential_ref)
}

pub(crate) fn delete(credential_ref: CredentialRef) -> BackendResult<()> {
    validate_ref(&credential_ref)?;
    KeyringStore::delete(&credential_ref)
}

fn validate_ref(credential_ref: &CredentialRef) -> BackendResult<()> {
    if credential_ref.service.trim().is_empty() {
        return Err(BackendError::validation("credential service is required"));
    }
    if credential_ref.key.trim().is_empty() {
        return Err(BackendError::validation("credential key is required"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_ref;
    use crate::domain::credential::{CredentialRef, DEFAULT_CREDENTIAL_SERVICE};

    #[test]
    fn session_password_ref_uses_stable_key() {
        let credential_ref = CredentialRef::session_password("abc");

        assert_eq!(credential_ref.service, DEFAULT_CREDENTIAL_SERVICE);
        assert_eq!(credential_ref.key, "session:abc:password");
    }

    #[test]
    fn validation_rejects_empty_key() {
        let error = validate_ref(&CredentialRef::new("vrshell", "")).expect_err("empty key fails");

        assert_eq!(error.code, "validationError");
    }
}
