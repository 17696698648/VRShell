use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SshConfigHost {
    pub alias: String,
    pub host: String,
    pub hostname: String,
    pub user: Option<String>,
    pub port: u16,
    pub identity_file: Option<String>,
}

impl SshConfigHost {
    fn new(alias: String) -> Self {
        Self {
            alias: alias.clone(),
            host: alias,
            hostname: String::new(),
            user: None,
            port: 22,
            identity_file: None,
        }
    }
}

pub(crate) fn parse_ssh_config(content: &str, home_dir: Option<&str>) -> Vec<SshConfigHost> {
    let mut hosts = Vec::new();
    let mut current: Option<SshConfigHost> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let Some((keyword, value)) = split_directive(trimmed) else {
            continue;
        };

        match keyword.to_ascii_lowercase().as_str() {
            "host" => {
                push_if_importable(&mut hosts, current.take());
                current = first_importable_alias(value).map(SshConfigHost::new);
            }
            "hostname" => {
                if let Some(host) = current.as_mut() {
                    host.hostname = value.to_string();
                }
            }
            "user" => {
                if let Some(host) = current.as_mut() {
                    host.user = Some(value.to_string());
                }
            }
            "port" => {
                if let Some(host) = current.as_mut() {
                    host.port = value.parse().unwrap_or(22);
                }
            }
            "identityfile" => {
                if let Some(host) = current.as_mut() {
                    if host.identity_file.is_none() {
                        host.identity_file = Some(expand_identity_file(value, home_dir));
                    }
                }
            }
            _ => {}
        }
    }

    push_if_importable(&mut hosts, current.take());
    hosts
}

fn split_directive(line: &str) -> Option<(&str, &str)> {
    let mut parts = line.splitn(2, char::is_whitespace);
    let keyword = parts.next()?.trim();
    let value = parts.next()?.trim();
    if keyword.is_empty() || value.is_empty() {
        return None;
    }
    Some((keyword, value))
}

fn first_importable_alias(value: &str) -> Option<String> {
    value
        .split_whitespace()
        .find(|alias| is_importable_alias(alias))
        .map(ToString::to_string)
}

fn is_importable_alias(alias: &str) -> bool {
    !alias.starts_with('!') && !alias.contains('*') && !alias.contains('?')
}

fn push_if_importable(hosts: &mut Vec<SshConfigHost>, host: Option<SshConfigHost>) {
    let Some(mut host) = host else {
        return;
    };
    if host.hostname.trim().is_empty() {
        host.hostname = host.host.clone();
    }
    hosts.push(host);
}

fn expand_identity_file(value: &str, home_dir: Option<&str>) -> String {
    let Some(home_dir) = home_dir.filter(|home| !home.is_empty()) else {
        return value.to_string();
    };

    if value == "~" {
        return home_dir.to_string();
    }
    if let Some(rest) = value.strip_prefix("~/") {
        return format!("{}/{}", home_dir.trim_end_matches(['/', '\\']), rest);
    }
    if value.contains(':') || value.starts_with('/') || value.starts_with('\\') {
        return value.to_string();
    }
    format!("{}/.ssh/{}", home_dir.trim_end_matches(['/', '\\']), value)
}

#[cfg(test)]
mod tests {
    use super::parse_ssh_config;

    #[test]
    fn parses_basic_hosts() {
        let hosts = parse_ssh_config(
            r#"
Host prod
  HostName prod.example.com
  User deploy
  Port 2222
  IdentityFile id_prod
"#,
            Some("/home/alice"),
        );

        assert_eq!(hosts.len(), 1);
        assert_eq!(hosts[0].alias, "prod");
        assert_eq!(hosts[0].hostname, "prod.example.com");
        assert_eq!(hosts[0].user.as_deref(), Some("deploy"));
        assert_eq!(hosts[0].port, 2222);
        assert_eq!(
            hosts[0].identity_file.as_deref(),
            Some("/home/alice/.ssh/id_prod")
        );
    }

    #[test]
    fn ignores_wildcard_and_negated_aliases() {
        let hosts = parse_ssh_config(
            r#"
Host *.internal !blocked
  HostName ignored
Host dev
  HostName dev.example.com
"#,
            Some("/home/alice"),
        );

        assert_eq!(hosts.len(), 1);
        assert_eq!(hosts[0].alias, "dev");
    }

    #[test]
    fn defaults_hostname_to_alias() {
        let hosts = parse_ssh_config("Host jump\n  User root", None);

        assert_eq!(hosts.len(), 1);
        assert_eq!(hosts[0].hostname, "jump");
    }

    #[test]
    fn expands_tilde_identity_file() {
        let hosts = parse_ssh_config(
            "Host prod\n  IdentityFile ~/.ssh/id_prod",
            Some("C:/Users/alice"),
        );

        assert_eq!(
            hosts[0].identity_file.as_deref(),
            Some("C:/Users/alice/.ssh/id_prod")
        );
    }
}
