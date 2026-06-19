pub(crate) fn normalize_remote_path(remote_path: &str) -> String {
    let normalized_input = remote_path.replace('\\', "/");
    let mut parts: Vec<&str> = Vec::new();

    for part in normalized_input.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            value => parts.push(value),
        }
    }

    if parts.is_empty() {
        "/".into()
    } else {
        format!("/{}", parts.join("/"))
    }
}

pub(crate) fn parent_remote_path(remote_path: &str) -> String {
    let normalized = normalize_remote_path(remote_path);
    let parts: Vec<&str> = normalized
        .split('/')
        .filter(|part| !part.is_empty())
        .collect();

    if parts.len() <= 1 {
        return "/".into();
    }

    format!("/{}", parts[..parts.len() - 1].join("/"))
}

pub(crate) fn join_remote_path(parent_path: &str, name: &str) -> String {
    let parent = normalize_remote_path(parent_path);
    let clean_name = name.trim_matches('/');

    if parent == "/" {
        normalize_remote_path(&format!("/{}", clean_name))
    } else {
        normalize_remote_path(&format!("{}/{}", parent, clean_name))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_root() {
        assert_eq!(normalize_remote_path("/"), "/");
    }

    #[test]
    fn normalize_simple_path() {
        assert_eq!(normalize_remote_path("/home/user"), "/home/user");
    }

    #[test]
    fn normalize_parent_refs() {
        assert_eq!(normalize_remote_path("/home/user/../../var"), "/var");
    }

    #[test]
    fn normalize_dot_segments() {
        assert_eq!(normalize_remote_path("/home/./user/./"), "/home/user");
    }

    #[test]
    fn normalize_double_slash() {
        assert_eq!(normalize_remote_path("home//user"), "/home/user");
    }

    #[test]
    fn normalize_parent_past_root() {
        assert_eq!(normalize_remote_path("/./../.."), "/");
    }

    #[test]
    fn normalize_windows_backslash() {
        assert_eq!(normalize_remote_path("\\\\home\\\\user"), "/home/user");
    }

    #[test]
    fn join_remote_path_basic() {
        assert_eq!(join_remote_path("/home", "user"), "/home/user");
    }

    #[test]
    fn join_remote_path_root() {
        assert_eq!(join_remote_path("/", "etc"), "/etc");
    }

    #[test]
    fn join_remote_path_dot_prefix() {
        assert_eq!(
            join_remote_path("/home/user", "./config"),
            "/home/user/config"
        );
    }

    #[test]
    fn join_remote_path_trailing_slash() {
        assert_eq!(join_remote_path("/home/", "user"), "/home/user");
    }

    #[test]
    fn parent_remote_path_simple() {
        assert_eq!(parent_remote_path("/home/user"), "/home");
    }

    #[test]
    fn parent_remote_path_root() {
        assert_eq!(parent_remote_path("/"), "/");
    }

    #[test]
    fn parent_remote_path_top_level() {
        assert_eq!(parent_remote_path("/home"), "/");
    }
}
