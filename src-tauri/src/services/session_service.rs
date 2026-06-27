use crate::{
    domain::{
        session::SessionGroup,
        session_tree::{
            apply_legacy_session_tree_action, apply_session_tree_payload, SessionTreeActionPayload,
        },
        ssh_config::SshConfigHost,
    },
    error::BackendResult,
    infrastructure::{file_store::FileStore, ssh_config_store::SshConfigStore},
    state::BackendState,
};

pub(crate) fn load_session_tree(state: &BackendState) -> BackendResult<Vec<SessionGroup>> {
    FileStore::from_paths(&state.paths).load_session_tree()
}

pub(crate) fn save_session_tree(
    state: &BackendState,
    session_tree: Vec<SessionGroup>,
) -> BackendResult<()> {
    FileStore::from_paths(&state.paths).save_session_tree(&session_tree)
}

pub(crate) fn import_ssh_config() -> BackendResult<Vec<SshConfigHost>> {
    SshConfigStore::from_environment().load_hosts()
}

pub(crate) fn session_tree_action(
    state: &BackendState,
    action: String,
    target_type: String,
    target_id: String,
) -> BackendResult<String> {
    let store = FileStore::from_paths(&state.paths);
    let mut groups = store.load_session_tree()?;
    let message = apply_legacy_session_tree_action(&mut groups, action, target_type, target_id)?;
    store.save_session_tree(&groups)?;
    Ok(message)
}

pub(crate) fn apply_session_tree_action_payload(
    state: &BackendState,
    payload: SessionTreeActionPayload,
) -> BackendResult<String> {
    let store = FileStore::from_paths(&state.paths);
    let mut groups = store.load_session_tree()?;
    let message = apply_session_tree_payload(&mut groups, payload)?;
    store.save_session_tree(&groups)?;
    Ok(message)
}

#[cfg(test)]
mod tests {
    use super::{
        apply_session_tree_action_payload, load_session_tree, save_session_tree,
        session_tree_action,
    };
    use crate::{
        domain::{
            session::{SessionGroup, SessionHost},
            session_tree::SessionTreeActionPayload,
        },
        state::BackendState,
    };
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn session_tree_action_persists_deleted_host() {
        let state = BackendState::new(temp_dir());
        save_session_tree(&state, sample_tree()).expect("save tree");

        session_tree_action(
            &state,
            "delete".to_string(),
            "host".to_string(),
            "host-1".to_string(),
        )
        .expect("delete host");

        let groups = load_session_tree(&state).expect("load tree");
        assert!(groups[0].hosts.is_empty());
        let _ = fs::remove_dir_all(state.paths.app_data_dir());
    }

    #[test]
    fn typed_action_payload_persists_created_host() {
        let state = BackendState::new(temp_dir());
        save_session_tree(&state, sample_tree()).expect("save tree");

        apply_session_tree_action_payload(
            &state,
            SessionTreeActionPayload {
                action: "create".to_string(),
                target_type: "host".to_string(),
                target_id: "host-2".to_string(),
                destination_group_id: Some("root".to_string()),
                group: None,
                host: Some(SessionHost {
                    id: Some("host-2".to_string()),
                    name: "Dev".to_string(),
                    user: "dev".to_string(),
                    address: "dev.example.com".to_string(),
                    port: 22,
                    auth_method: "key".to_string(),
                    remark: String::new(),
                    credential_ref: None,
                }),
            },
        )
        .expect("create host");

        let groups = load_session_tree(&state).expect("load tree");
        assert_eq!(groups[0].hosts.len(), 2);
        let _ = fs::remove_dir_all(state.paths.app_data_dir());
    }

    fn sample_tree() -> Vec<SessionGroup> {
        vec![SessionGroup {
            id: "root".to_string(),
            name: "Root".to_string(),
            icon: "server".to_string(),
            hosts: vec![SessionHost {
                id: Some("host-1".to_string()),
                name: "Prod".to_string(),
                user: "deploy".to_string(),
                address: "prod.example.com".to_string(),
                port: 22,
                auth_method: "password".to_string(),
                remark: String::new(),
                credential_ref: None,
            }],
            children: Vec::new(),
        }]
    }

    fn temp_dir() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("vrshell-session-service-test-{unique}"))
    }
}
