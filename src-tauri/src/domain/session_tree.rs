use crate::{
    domain::session::{SessionGroup, SessionHost},
    error::{BackendError, BackendResult},
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionTreeActionPayload {
    pub action: String,
    pub target_type: String,
    pub target_id: String,
    pub destination_group_id: Option<String>,
    pub group: Option<SessionGroup>,
    pub host: Option<SessionHost>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum SessionTreeTarget {
    Group,
    Host,
}

impl SessionTreeTarget {
    pub(crate) fn parse(value: &str) -> BackendResult<Self> {
        match value {
            "group" | "sessionGroup" => Ok(Self::Group),
            "host" | "sessionHost" | "session" => Ok(Self::Host),
            _ => Err(BackendError::validation(format!(
                "unsupported session tree target type: {value}"
            ))),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum SessionTreeAction {
    Create,
    Edit,
    Delete,
    MoveToGroup,
    Touch,
}

impl SessionTreeAction {
    pub(crate) fn parse(value: &str) -> BackendResult<Self> {
        match value {
            "create" | "add" => Ok(Self::Create),
            "edit" | "update" => Ok(Self::Edit),
            "delete" | "remove" => Ok(Self::Delete),
            "move" | "moveToGroup" => Ok(Self::MoveToGroup),
            "touch" | "noop" => Ok(Self::Touch),
            _ => Err(BackendError::validation(format!(
                "unsupported session tree action: {value}"
            ))),
        }
    }
}

pub(crate) fn apply_session_tree_payload(
    groups: &mut Vec<SessionGroup>,
    payload: SessionTreeActionPayload,
) -> BackendResult<String> {
    let action = SessionTreeAction::parse(&payload.action)?;
    let target_type = SessionTreeTarget::parse(&payload.target_type)?;
    apply_session_tree_action(groups, action, target_type, payload)
}

pub(crate) fn apply_legacy_session_tree_action(
    groups: &mut Vec<SessionGroup>,
    action: String,
    target_type: String,
    target_id: String,
) -> BackendResult<String> {
    apply_session_tree_payload(
        groups,
        SessionTreeActionPayload {
            action,
            target_type,
            target_id,
            destination_group_id: None,
            group: None,
            host: None,
        },
    )
}

fn apply_session_tree_action(
    groups: &mut Vec<SessionGroup>,
    action: SessionTreeAction,
    target_type: SessionTreeTarget,
    payload: SessionTreeActionPayload,
) -> BackendResult<String> {
    if payload.target_id.trim().is_empty() {
        return Err(BackendError::validation("target id is required"));
    }

    match action {
        SessionTreeAction::Create => create_target(groups, target_type, payload),
        SessionTreeAction::Edit => edit_target(groups, target_type, payload),
        SessionTreeAction::Delete => delete_target(groups, target_type, &payload.target_id),
        SessionTreeAction::MoveToGroup => move_target(groups, target_type, payload),
        SessionTreeAction::Touch => Ok(format!("{} unchanged", payload.target_id)),
    }
}

fn create_target(
    groups: &mut Vec<SessionGroup>,
    target_type: SessionTreeTarget,
    payload: SessionTreeActionPayload,
) -> BackendResult<String> {
    match target_type {
        SessionTreeTarget::Group => {
            let group = payload
                .group
                .ok_or_else(|| BackendError::validation("group payload is required"))?;
            ensure_group_id_available(groups, &group.id)?;
            append_group(groups, payload.destination_group_id.as_deref(), group)?;
            Ok(format!("{} created", payload.target_id))
        }
        SessionTreeTarget::Host => {
            let host = payload
                .host
                .ok_or_else(|| BackendError::validation("host payload is required"))?;
            append_host(groups, payload.destination_group_id.as_deref(), host)?;
            Ok(format!("{} created", payload.target_id))
        }
    }
}

fn edit_target(
    groups: &mut Vec<SessionGroup>,
    target_type: SessionTreeTarget,
    payload: SessionTreeActionPayload,
) -> BackendResult<String> {
    match target_type {
        SessionTreeTarget::Group => {
            let group = payload
                .group
                .ok_or_else(|| BackendError::validation("group payload is required"))?;
            replace_group(groups, &payload.target_id, group)?;
            Ok(format!("{} updated", payload.target_id))
        }
        SessionTreeTarget::Host => {
            let host = payload
                .host
                .ok_or_else(|| BackendError::validation("host payload is required"))?;
            replace_host(groups, &payload.target_id, host)?;
            Ok(format!("{} updated", payload.target_id))
        }
    }
}

fn delete_target(
    groups: &mut Vec<SessionGroup>,
    target_type: SessionTreeTarget,
    target_id: &str,
) -> BackendResult<String> {
    let deleted = match target_type {
        SessionTreeTarget::Group => remove_group(groups, target_id).is_some(),
        SessionTreeTarget::Host => remove_host(groups, target_id).is_some(),
    };

    if deleted {
        Ok(format!("{target_id} deleted"))
    } else {
        Err(target_not_found(target_id))
    }
}

fn move_target(
    groups: &mut Vec<SessionGroup>,
    target_type: SessionTreeTarget,
    payload: SessionTreeActionPayload,
) -> BackendResult<String> {
    let destination_group_id = payload
        .destination_group_id
        .as_deref()
        .ok_or_else(|| BackendError::validation("destination group id is required"))?;

    match target_type {
        SessionTreeTarget::Group => {
            if payload.target_id == destination_group_id {
                return Err(BackendError::validation("cannot move group into itself"));
            }
            let group = remove_group(groups, &payload.target_id)
                .ok_or_else(|| target_not_found(&payload.target_id))?;
            append_group(groups, Some(destination_group_id), group)?;
        }
        SessionTreeTarget::Host => {
            let host = remove_host(groups, &payload.target_id)
                .ok_or_else(|| target_not_found(&payload.target_id))?;
            append_host(groups, Some(destination_group_id), host)?;
        }
    }

    Ok(format!("{} moved", payload.target_id))
}

fn append_group(
    groups: &mut Vec<SessionGroup>,
    destination_group_id: Option<&str>,
    group: SessionGroup,
) -> BackendResult<()> {
    if let Some(destination_group_id) = destination_group_id {
        let destination = find_group_mut(groups, destination_group_id)
            .ok_or_else(|| target_not_found(destination_group_id))?;
        destination.children.push(group);
    } else {
        groups.push(group);
    }
    Ok(())
}

fn append_host(
    groups: &mut Vec<SessionGroup>,
    destination_group_id: Option<&str>,
    host: SessionHost,
) -> BackendResult<()> {
    if groups.is_empty() {
        return Err(BackendError::validation(
            "session tree has no destination group",
        ));
    }

    if let Some(destination_group_id) = destination_group_id {
        let destination = find_group_mut(groups, destination_group_id)
            .ok_or_else(|| target_not_found(destination_group_id))?;
        destination.hosts.push(host);
    } else {
        groups[0].hosts.push(host);
    }
    Ok(())
}

fn replace_group(
    groups: &mut Vec<SessionGroup>,
    group_id: &str,
    replacement: SessionGroup,
) -> BackendResult<()> {
    let group = find_group_mut(groups, group_id).ok_or_else(|| target_not_found(group_id))?;
    let children = std::mem::take(&mut group.children);
    let hosts = std::mem::take(&mut group.hosts);
    *group = replacement;
    if group.children.is_empty() {
        group.children = children;
    }
    if group.hosts.is_empty() {
        group.hosts = hosts;
    }
    Ok(())
}

fn replace_host(
    groups: &mut [SessionGroup],
    host_id: &str,
    replacement: SessionHost,
) -> BackendResult<()> {
    for group in groups.iter_mut() {
        if let Some(host) = group
            .hosts
            .iter_mut()
            .find(|host| host_matches_id(host, host_id))
        {
            *host = replacement;
            return Ok(());
        }
        if replace_host(&mut group.children, host_id, replacement.clone()).is_ok() {
            return Ok(());
        }
    }
    Err(target_not_found(host_id))
}

fn remove_group(groups: &mut Vec<SessionGroup>, group_id: &str) -> Option<SessionGroup> {
    if let Some(index) = groups.iter().position(|group| group.id == group_id) {
        return Some(groups.remove(index));
    }

    for group in groups.iter_mut() {
        if let Some(removed) = remove_group(&mut group.children, group_id) {
            return Some(removed);
        }
    }
    None
}

fn remove_host(groups: &mut [SessionGroup], host_id: &str) -> Option<SessionHost> {
    for group in groups.iter_mut() {
        if let Some(index) = group
            .hosts
            .iter()
            .position(|host| host_matches_id(host, host_id))
        {
            return Some(group.hosts.remove(index));
        }
        if let Some(removed) = remove_host(&mut group.children, host_id) {
            return Some(removed);
        }
    }
    None
}

fn find_group_mut<'a>(
    groups: &'a mut [SessionGroup],
    group_id: &str,
) -> Option<&'a mut SessionGroup> {
    for group in groups.iter_mut() {
        if group.id == group_id {
            return Some(group);
        }
        if let Some(found) = find_group_mut(&mut group.children, group_id) {
            return Some(found);
        }
    }
    None
}

fn ensure_group_id_available(groups: &[SessionGroup], group_id: &str) -> BackendResult<()> {
    if group_id.trim().is_empty() {
        return Err(BackendError::validation("group id is required"));
    }
    if contains_group(groups, group_id) {
        return Err(BackendError::validation(format!(
            "session group already exists: {group_id}"
        )));
    }
    Ok(())
}

fn contains_group(groups: &[SessionGroup], group_id: &str) -> bool {
    groups
        .iter()
        .any(|group| group.id == group_id || contains_group(&group.children, group_id))
}

fn host_matches_id(host: &SessionHost, host_id: &str) -> bool {
    host.id.as_deref() == Some(host_id) || host.name == host_id || host.address == host_id
}

fn target_not_found(target_id: &str) -> BackendError {
    BackendError::validation(format!("session tree target not found: {target_id}"))
}

#[cfg(test)]
mod tests {
    use super::{
        apply_legacy_session_tree_action, apply_session_tree_payload, SessionTreeActionPayload,
    };
    use crate::domain::session::{SessionGroup, SessionHost};

    #[test]
    fn deletes_host_from_nested_group() {
        let mut groups = sample_tree();

        apply_legacy_session_tree_action(
            &mut groups,
            "delete".to_string(),
            "host".to_string(),
            "host-1".to_string(),
        )
        .expect("delete host");

        assert!(groups[0].children[0].hosts.is_empty());
    }

    #[test]
    fn creates_host_in_destination_group() {
        let mut groups = sample_tree();

        apply_session_tree_payload(
            &mut groups,
            SessionTreeActionPayload {
                action: "create".to_string(),
                target_type: "host".to_string(),
                target_id: "host-2".to_string(),
                destination_group_id: Some("child".to_string()),
                group: None,
                host: Some(host("host-2", "Dev")),
            },
        )
        .expect("create host");

        assert_eq!(groups[0].children[0].hosts.len(), 2);
    }

    #[test]
    fn edits_host_in_place() {
        let mut groups = sample_tree();

        apply_session_tree_payload(
            &mut groups,
            SessionTreeActionPayload {
                action: "edit".to_string(),
                target_type: "host".to_string(),
                target_id: "host-1".to_string(),
                destination_group_id: None,
                group: None,
                host: Some(host("host-1", "Production")),
            },
        )
        .expect("edit host");

        assert_eq!(groups[0].children[0].hosts[0].name, "Production");
    }

    #[test]
    fn moves_host_to_destination_group() {
        let mut groups = sample_tree();

        apply_session_tree_payload(
            &mut groups,
            SessionTreeActionPayload {
                action: "move".to_string(),
                target_type: "host".to_string(),
                target_id: "host-1".to_string(),
                destination_group_id: Some("root".to_string()),
                group: None,
                host: None,
            },
        )
        .expect("move host");

        assert_eq!(groups[0].hosts.len(), 1);
        assert!(groups[0].children[0].hosts.is_empty());
    }

    #[test]
    fn rejects_unknown_target() {
        let mut groups = sample_tree();
        let error = apply_legacy_session_tree_action(
            &mut groups,
            "delete".to_string(),
            "host".to_string(),
            "missing".to_string(),
        )
        .expect_err("missing target fails");

        assert_eq!(error.code, "validationError");
    }

    fn sample_tree() -> Vec<SessionGroup> {
        vec![SessionGroup {
            id: "root".to_string(),
            name: "Root".to_string(),
            icon: "server".to_string(),
            hosts: Vec::new(),
            children: vec![SessionGroup {
                id: "child".to_string(),
                name: "Child".to_string(),
                icon: "folder".to_string(),
                hosts: vec![host("host-1", "Prod")],
                children: Vec::new(),
            }],
        }]
    }

    fn host(id: &str, name: &str) -> SessionHost {
        SessionHost {
            id: Some(id.to_string()),
            name: name.to_string(),
            user: "deploy".to_string(),
            address: format!("{id}.example.com"),
            port: 22,
            auth_method: "password".to_string(),
            remark: String::new(),
            credential_ref: None,
        }
    }
}
